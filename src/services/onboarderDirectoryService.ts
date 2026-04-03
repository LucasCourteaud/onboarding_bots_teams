import fs from "node:fs/promises";
import path from "node:path";

import { z } from "zod";

import { appConfig } from "../config";
import {
  MentorProfile,
  OnboarderDirectoryData,
  OnboarderDirectoryEntry,
  PersonProfile,
  ResolvedOnboarderDirectoryEntry
} from "../models/onboarding";

const personSchema = z.object({
  aadUserId: z.string(),
  displayName: z.string(),
  email: z.string().email(),
  role: z.string().optional(),
  team: z.string().optional()
});

const mentorSchema = personSchema.extend({
  onboardeeIds: z.array(z.string()).default([])
});

const onboarderEntrySchema = z.object({
  userId: z.string(),
  displayName: z.string(),
  mentorId: z.string()
});

const legacyOnboarderEntrySchema = z.object({
  userId: z.string(),
  displayName: z.string(),
  mentor: personSchema
});

const onboarderDirectorySchema = z.union([
  onboarderEntrySchema,
  legacyOnboarderEntrySchema,
  z.object({
    mentors: z.array(z.union([personSchema, mentorSchema])).optional(),
    profiles: z.array(z.union([onboarderEntrySchema, legacyOnboarderEntrySchema]))
  })
]);

export class OnboarderDirectoryService {
  private directoryData?: OnboarderDirectoryData;
  private cache?: Map<string, OnboarderDirectoryEntry>;
  private mentorPool: MentorProfile[] = [];
  private mentorsById = new Map<string, MentorProfile>();

  constructor(
    private readonly directoryPath = "./onboarder.json",
    private readonly genericMentor: MentorProfile = {
      aadUserId: appConfig.onboarding.defaults.mentorAadId ?? "generic-mentor",
      displayName: appConfig.onboarding.defaults.mentorName ?? "Mentor EPITECH",
      email: appConfig.onboarding.defaults.mentorEmail ?? "mentor.onboarding@epitech.eu",
      onboardeeIds: []
    }
  ) {}

  async ensureAssignment(userId: string, displayName: string): Promise<ResolvedOnboarderDirectoryEntry> {
    const directory = await this.load();
    const existing = directory.get(userId);

    if (existing) {
      return this.resolveEntry(existing);
    }

    const mentor = this.selectMentorForOnboarder(userId);

    const entry: OnboarderDirectoryEntry = {
      userId,
      displayName,
      mentorId: mentor.aadUserId
    };

    directory.set(userId, entry);
    this.addOnboardeeToMentor(mentor.aadUserId, userId);
    await this.save();

    return {
      userId: entry.userId,
      displayName: entry.displayName,
      mentor
    };
  }

  async findByUserId(userId: string): Promise<ResolvedOnboarderDirectoryEntry | undefined> {
    const directory = await this.load();
    const entry = directory.get(userId);
    return entry ? this.resolveEntry(entry) : undefined;
  }

  async findMentorByUserId(userId: string, displayName: string): Promise<PersonProfile> {
    const entry = await this.ensureAssignment(userId, displayName);
    return entry.mentor;
  }

  private async load(): Promise<Map<string, OnboarderDirectoryEntry>> {
    if (this.cache) {
      return this.cache;
    }

    const absolutePath = path.resolve(process.cwd(), this.directoryPath);
    let directoryData: OnboarderDirectoryData = {
      profiles: []
    };

    try {
      const rawContent = await fs.readFile(absolutePath, "utf-8");
      const parsed = onboarderDirectorySchema.parse(JSON.parse(rawContent));
      directoryData = this.normalizeDirectoryData(parsed);
    } catch (error) {
      const nodeError = error as NodeJS.ErrnoException;
      if (nodeError.code !== "ENOENT") {
        throw error;
      }
    }

    this.directoryData = directoryData;
    this.mentorPool = directoryData.mentors?.length ? directoryData.mentors : [this.genericMentor];
    this.mentorsById = new Map(this.mentorPool.map((mentor) => [mentor.aadUserId, mentor]));
    this.cache = new Map(directoryData.profiles.map((entry) => [entry.userId, entry]));
    return this.cache;
  }

  private selectMentorForOnboarder(userId: string): MentorProfile {
    const mentorPool = this.mentorPool.length > 0 ? this.mentorPool : [this.genericMentor];
    const mentorIndex = this.computeStableIndex(userId, mentorPool.length);
    return mentorPool[mentorIndex];
  }

  private normalizeDirectoryData(parsed: z.infer<typeof onboarderDirectorySchema>): OnboarderDirectoryData {
    if ("profiles" in parsed) {
      const mentors = (parsed.mentors ?? []).map((mentor) => this.normalizeMentor(mentor));
      const legacyMentors = parsed.profiles
        .filter((entry): entry is z.infer<typeof legacyOnboarderEntrySchema> => "mentor" in entry)
        .map((entry) => this.normalizeMentor(entry.mentor));

      const directoryData = {
        mentors: this.deduplicateMentors([...mentors, ...legacyMentors]),
        profiles: parsed.profiles.map((entry) => this.normalizeEntry(entry))
      };

      this.syncMentorAssignments(directoryData);

      return directoryData;
    }

    if ("mentor" in parsed) {
      const directoryData = {
        mentors: [this.normalizeMentor(parsed.mentor)],
        profiles: [this.normalizeEntry(parsed)]
      };

      this.syncMentorAssignments(directoryData);

      return directoryData;
    }

    return {
      profiles: [parsed]
    };
  }

  private normalizeEntry(
    entry: z.infer<typeof onboarderEntrySchema> | z.infer<typeof legacyOnboarderEntrySchema>
  ): OnboarderDirectoryEntry {
    if ("mentor" in entry) {
      return {
        userId: entry.userId,
        displayName: entry.displayName,
        mentorId: entry.mentor.aadUserId
      };
    }

    return entry;
  }

  private normalizeMentor(mentor: PersonProfile | MentorProfile): MentorProfile {
    return {
      ...mentor,
      onboardeeIds: "onboardeeIds" in mentor ? [...mentor.onboardeeIds] : []
    };
  }

  private deduplicateMentors(mentors: MentorProfile[]): MentorProfile[] {
    const deduplicated = new Map<string, MentorProfile>();

    for (const mentor of mentors) {
      const existing = deduplicated.get(mentor.aadUserId);
      deduplicated.set(mentor.aadUserId, existing
        ? {
            ...existing,
            ...mentor,
            onboardeeIds: this.mergeOnboardeeIds(existing.onboardeeIds, mentor.onboardeeIds)
          }
        : mentor);
    }

    if (!deduplicated.has(this.genericMentor.aadUserId)) {
      deduplicated.set(this.genericMentor.aadUserId, this.genericMentor);
    }

    return [...deduplicated.values()];
  }

  private resolveEntry(entry: OnboarderDirectoryEntry): ResolvedOnboarderDirectoryEntry {
    return {
      userId: entry.userId,
      displayName: entry.displayName,
      mentor: this.mentorsById.get(entry.mentorId) ?? this.genericMentor
    };
  }

  private syncMentorAssignments(directoryData: OnboarderDirectoryData): void {
    const mentorsById = new Map((directoryData.mentors ?? []).map((mentor) => [mentor.aadUserId, mentor]));

    for (const profile of directoryData.profiles) {
      const mentor = mentorsById.get(profile.mentorId);
      if (!mentor) {
        continue;
      }

      mentor.onboardeeIds = this.mergeOnboardeeIds(mentor.onboardeeIds, [profile.userId]);
    }
  }

  private addOnboardeeToMentor(mentorId: string, userId: string): void {
    const mentor = this.mentorsById.get(mentorId);
    if (!mentor || !this.directoryData?.mentors) {
      return;
    }

    mentor.onboardeeIds = this.mergeOnboardeeIds(mentor.onboardeeIds, [userId]);
    this.directoryData.mentors = this.directoryData.mentors.map((entry) => entry.aadUserId === mentorId ? mentor : entry);
    this.directoryData.profiles = [...this.cache?.values() ?? []];
  }

  private mergeOnboardeeIds(existingIds: string[], newIds: string[]): string[] {
    return [...new Set([...existingIds, ...newIds])];
  }

  private async save(): Promise<void> {
    if (!this.directoryData || !this.cache) {
      return;
    }

    const absolutePath = path.resolve(process.cwd(), this.directoryPath);
    const content = JSON.stringify(
      {
        mentors: this.directoryData.mentors,
        profiles: [...this.cache.values()]
      },
      null,
      2
    );

    await fs.writeFile(absolutePath, `${content}\n`, "utf-8");
  }

  private computeStableIndex(seed: string, length: number): number {
    let hash = 0;

    for (const character of seed) {
      hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
    }

    return hash % length;
  }
}
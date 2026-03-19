import fs from "node:fs/promises";
import path from "node:path";

import AdmZip from "adm-zip";
import dotenv from "dotenv";

dotenv.config();

const rootDir = process.cwd();
const appPackageDir = path.join(rootDir, "appPackage");
const buildDir = path.join(appPackageDir, "build");
const templatePath = path.join(appPackageDir, "manifest.template.json");
const colorIconPath = path.join(appPackageDir, "color.png");
const outlineIconPath = path.join(appPackageDir, "outline.png");

function requireEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function normalizeHostname(input) {
  return input.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

async function main() {
  const botAppId = requireEnv("BOT_APP_ID");
  const publicHostname = normalizeHostname(requireEnv("PUBLIC_HOSTNAME"));
  const teamsAppId = process.env.TEAMS_APP_ID?.trim() || botAppId;

  const template = await fs.readFile(templatePath, "utf-8");
  const manifestContent = template
    .replaceAll("{{BOT_APP_ID}}", botAppId)
    .replaceAll("{{PUBLIC_HOSTNAME}}", publicHostname)
    .replaceAll("{{TEAMS_APP_ID}}", teamsAppId);

  await fs.mkdir(buildDir, { recursive: true });
  const manifestOutputPath = path.join(buildDir, "manifest.json");
  await fs.writeFile(manifestOutputPath, manifestContent, "utf-8");

  const zip = new AdmZip();
  zip.addLocalFile(manifestOutputPath);
  zip.addLocalFile(colorIconPath);
  zip.addLocalFile(outlineIconPath);

  const zipOutputPath = path.join(buildDir, "botteams-onboarding-poc.zip");
  zip.writeZip(zipOutputPath);

  console.log(`Generated Teams package: ${zipOutputPath}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
import pino from "pino";

import { appConfig } from "../config";

export const logger = pino({
  level: appConfig.logging.level,
  timestamp: pino.stdTimeFunctions.isoTime,
  base: undefined
});
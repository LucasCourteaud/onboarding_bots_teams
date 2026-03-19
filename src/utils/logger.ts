type LogContext = Record<string, unknown>;

function formatContext(context?: LogContext): string {
  if (!context || Object.keys(context).length === 0) {
    return "";
  }

  return ` ${JSON.stringify(context)}`;
}

export const logger = {
  info(message: string, context?: LogContext): void {
    console.log(`[INFO] ${message}${formatContext(context)}`);
  },
  warn(message: string, context?: LogContext): void {
    console.warn(`[WARN] ${message}${formatContext(context)}`);
  },
  error(message: string, context?: LogContext): void {
    console.error(`[ERROR] ${message}${formatContext(context)}`);
  }
};
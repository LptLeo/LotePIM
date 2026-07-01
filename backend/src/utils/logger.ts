export const logger = {
  info: (msg: string) =>
    process.stdout.write(`[INFO]  ${new Date().toISOString()} ${msg}\n`),
  warn: (msg: string) =>
    process.stderr.write(`[WARN]  ${new Date().toISOString()} ${msg}\n`),
  error: (msg: string, err?: unknown) =>
    process.stderr.write(
      `[ERROR] ${new Date().toISOString()} ${msg}${err ? ` — ${err}` : ''}\n`,
    ),
};

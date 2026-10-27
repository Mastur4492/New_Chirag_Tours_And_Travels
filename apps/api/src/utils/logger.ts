type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogPayload {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, unknown>;
  error?: Error | unknown;
}

function formatLog(payload: LogPayload): string {
  const meta = payload.context ? ` ${JSON.stringify(payload.context)}` : '';
  const err = payload.error instanceof Error ? `\n${payload.error.stack}` : payload.error ? ` ${JSON.stringify(payload.error)}` : '';
  return `[${payload.timestamp}] [${payload.level.toUpperCase()}] ${payload.message}${meta}${err}`;
}

export const logger = {
  info(message: string, context?: Record<string, unknown>): void {
    const output = formatLog({
      level: 'info',
      message,
      timestamp: new Date().toISOString(),
      context,
    });
    console.log(output);
  },

  warn(message: string, context?: Record<string, unknown>): void {
    const output = formatLog({
      level: 'warn',
      message,
      timestamp: new Date().toISOString(),
      context,
    });
    console.warn(output);
  },

  error(message: string, error?: Error | unknown, context?: Record<string, unknown>): void {
    const output = formatLog({
      level: 'error',
      message,
      timestamp: new Date().toISOString(),
      context,
      error,
    });
    console.error(output);
  },

  debug(message: string, context?: Record<string, unknown>): void {
    if (process.env.NODE_ENV === 'development' || process.env.DEBUG === 'true') {
      const output = formatLog({
        level: 'debug',
        message,
        timestamp: new Date().toISOString(),
        context,
      });
      console.debug(output);
    }
  },
};

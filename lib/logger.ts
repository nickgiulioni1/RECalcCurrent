// Define a more specific type for log data
type LogData = unknown | Record<string, unknown> | null | undefined;

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogMessage {
  message: string;
  data?: LogData;
  timestamp: string;
  level: LogLevel;
}

class Logger {
  private logs: LogMessage[] = [];
  private readonly maxLogs = 1000;
  private levelThreshold: LogLevel;

  constructor() {
    // Determine log level from env; default to 'debug' in dev, 'info' in prod
    const envLevel = (typeof process !== 'undefined'
      ? (process.env.NEXT_PUBLIC_LOG_LEVEL as LogLevel | undefined)
      : undefined);
    const nodeEnv = (typeof process !== 'undefined' ? process.env.NODE_ENV : 'development') || 'development';
    this.levelThreshold = envLevel || (nodeEnv === 'production' ? 'info' : 'debug');
  }

  private getLevelWeight(level: LogLevel): number {
    switch (level) {
      case 'debug':
        return 10;
      case 'info':
        return 20;
      case 'warn':
        return 30;
      case 'error':
        return 40;
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return this.getLevelWeight(level) >= this.getLevelWeight(this.levelThreshold);
  }

  private createLogMessage(level: LogLevel, message: string, data?: LogData): LogMessage {
    console.debug('[Logger] Creating log message', { level, message });
    return {
      message,
      data,
      timestamp: new Date().toISOString(),
      level,
    };
  }

  private log(level: LogLevel, message: string, data?: LogData) {
    if (!this.shouldLog(level)) {
      return;
    }
    const logMessage = this.createLogMessage(level, message, data);
    
    // Add to internal logs array
    this.logs.push(logMessage);
    
    // Trim logs if they exceed maxLogs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Console output
    const consoleMessage = `[${logMessage.timestamp}] ${message}`;
    switch (level) {
      case 'debug':
        console.debug(consoleMessage, data || '');
        break;
      case 'info':
        console.info(consoleMessage, data || '');
        break;
      case 'warn':
        console.warn(consoleMessage, data || '');
        break;
      case 'error':
        console.error(consoleMessage, data || '');
        break;
    }
  }

  debug(message: string, data?: LogData) {
    this.log('debug', message, data);
  }

  info(message: string, data?: LogData) {
    this.log('info', message, data);
  }

  warn(message: string, data?: LogData) {
    this.log('warn', message, data);
  }

  error(message: string, data?: LogData) {
    this.log('error', message, data);
  }

  getLogs(): LogMessage[] {
    return [...this.logs];
  }

  clearLogs() {
    this.logs = [];
  }

  setLevel(level: LogLevel) {
    this.levelThreshold = level;
  }
}

export const logger = new Logger(); 
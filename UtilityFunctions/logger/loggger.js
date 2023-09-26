import winston from 'winston';
import fs from 'fs';
import path from 'path';
import logform from 'logform';

const logsDir = path.join(process.cwd(), 'Logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

const { combine, timestamp, printf } = logform.format;

const logFormat = printf(({ level, message, timestamp }) => {
  return `${timestamp} ${level}: ${message}`;
});

const logger = winston.createLogger({
  level: 'info',
  format: combine(
    timestamp(),
    logFormat
  ),
  transports: [
    new winston.transports.File({
      filename: path.join(logsDir, `log_${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.log`)
    })
  ]
});

export { logger };
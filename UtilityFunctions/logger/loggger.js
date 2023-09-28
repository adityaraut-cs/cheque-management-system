const env = process.env.NODE_ENV === "development" ? "debug" : "info";
import { existsSync, mkdirSync } from "fs";
const logDir = "Logs";
import { transports as _transports, createLogger, format as _format } from "winston";
import split from 'split';
import rTracer, { id } from 'cls-rtracer';
global.rTracer = rTracer;
import "winston-daily-rotate-file";

var logger;

if (!existsSync(logDir)) {
  mkdirSync(logDir);
}

const dailyRotateFileTransport = new _transports.DailyRotateFile({
  filename: `${logDir}/%DATE%-result.log`,
  datePattern: 'YYYY-MM-DD',
  maxSize: '10m',
  maxFiles: '3d',
  handleExceptions: true,
  handleRejections: true
});

logger = createLogger({
  level: env,
  format: _format.combine(
    _format.timestamp({
      format: "YYYY-MM-DD HH:mm:ss"
    }),
    _format.printf(
      info => {
        const rid = id()
        return rid
          ? `${info.timestamp} [request-id:${rid}]: ${info.level}: ${info.message}`
          : `${info.timestamp} ${info.level}: ${info.message}`;
      }
    )
  ),

  transports: [
    new _transports.Console({
      level: "info",
      handleExceptions: true,
      handleRejections: true,
      format: _format.combine(
        _format.colorize(),
        _format.printf(
          info => {
            const rid = id()
            return rid
              ? `${info.timestamp} [request-id:${rid}]: ${info.level}: ${info.message}`
              : `${info.timestamp} ${info.level}: ${info.message}`;
          }
        )
      )
    }),
    dailyRotateFileTransport
  ]
});

logger.stream = split().on('data', function (message) {
  logger.info(message);
});


export default logger
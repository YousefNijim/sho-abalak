import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  private logger = new Logger('HTTP');

  use(request: Request, response: Response, next: NextFunction): void {
    const { ip, method, originalUrl, body } = request;
    const userAgent = request.get('user-agent') || '';
    const start = Date.now();

    response.on('finish', () => {
      const { statusCode } = response;
      const contentLength = response.get('content-length');
      const duration = Date.now() - start;

      const logMsg = `${method} ${originalUrl} ${statusCode} ${contentLength} - ${userAgent} ${ip} [${duration}ms] - Body: ${JSON.stringify(body)}`;
      
      if (statusCode >= 400) {
        this.logger.error(logMsg);
      } else {
        this.logger.log(logMsg);
      }

      // Append to file
      const logFile = path.join(process.cwd(), 'activity.log');
      fs.appendFile(logFile, `[${new Date().toISOString()}] ${logMsg}\n`, (err) => {
        if (err) console.error('Failed to write to log file', err);
      });
    });

    next();
  }
}

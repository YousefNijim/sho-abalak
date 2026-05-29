import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class SentryExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'حدث خطأ داخلي في الخادم. يرجى المحاولة لاحقاً.';

    const errorDetails = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message: typeof message === 'object' ? (message as any).message || (message as any).error : message,
    };

    // Log the unhandled error details
    if (status === HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `[Sentry Incident Captured] Unhandled server crash: ${request.method} ${request.url}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
      // NOTE: For live dashboard, integrate here:
      // Sentry.captureException(exception);
    } else {
      this.logger.warn(
        `HTTP Exception [${status}] on ${request.method} ${request.url}: ${JSON.stringify(errorDetails.message)}`
      );
    }

    response.status(status).json(errorDetails);
  }
}

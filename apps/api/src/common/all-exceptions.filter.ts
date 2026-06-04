import {
  Catch,
  ArgumentsHost,
  ExceptionFilter,
  HttpException,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    // If it's an HttpException, use its status and body as-is
    // (keeps validation errors with message array, etc.)
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      return response.status(status).json(exceptionResponse);
    }

    // For any other error: log server-side, respond with generic 500
    console.error('Unhandled exception:', exception);

    response.status(500).json({
      statusCode: 500,
      message: 'Lỗi máy chủ. Vui lòng thử lại.',
      error: 'Internal Server Error',
    });
  }
}

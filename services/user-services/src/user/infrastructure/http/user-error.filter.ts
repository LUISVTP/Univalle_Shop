import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import type { Response } from 'express';
import { EmailAlreadyExists, InvalidUser } from '../../domain/errors.js';

@Catch(InvalidUser, EmailAlreadyExists)
export class UserErrorFilter implements ExceptionFilter {
  catch(error: InvalidUser | EmailAlreadyExists, host: ArgumentsHost) {
    const status = error instanceof EmailAlreadyExists ? 409 : 400;
    host
      .switchToHttp()
      .getResponse<Response>()
      .status(status)
      .json({ statusCode: status, message: error.message });
  }
}

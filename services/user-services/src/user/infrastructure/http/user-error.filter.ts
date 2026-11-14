import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import type { Response } from 'express';
import {
  EmailAlreadyExists,
  InvalidUser,
  UserNotFound,
} from '../../domain/errors.js';

@Catch(InvalidUser, EmailAlreadyExists, UserNotFound)
export class UserErrorFilter implements ExceptionFilter {
  catch(error: InvalidUser | EmailAlreadyExists, host: ArgumentsHost) {
    const status =
      error instanceof UserNotFound
        ? 404
        : error instanceof EmailAlreadyExists
          ? 409
          : 400;
    host
      .switchToHttp()
      .getResponse<Response>()
      .status(status)
      .json({ statusCode: status, message: error.message });
  }
}

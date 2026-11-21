import { ArgumentsHost, Catch } from '@nestjs/common';
import type { ExceptionFilter } from '@nestjs/common';
import type { Response } from 'express';
import { DomainError } from '../domain/errors.js';
@Catch(DomainError)
export class ErrorFilter implements ExceptionFilter {
  catch(error: DomainError, host: ArgumentsHost) {
    const status = { invalid: 400, missing: 404, conflict: 409, upstream: 502 }[
      error.code
    ];
    host
      .switchToHttp()
      .getResponse<Response>()
      .status(status)
      .json({ statusCode: status, message: error.message });
  }
}

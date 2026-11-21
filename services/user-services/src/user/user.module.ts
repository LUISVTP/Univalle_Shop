import { UserReader } from './domain/port/user-reader.js';
import { GetUserUseCase } from './application/use-cases/get-user.use-case.js';
import { UserQueryController } from './infrastructure/http/user-query.controller.js';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CreateUserUseCase } from './application/use-cases/create-user.use-case.js';
import { UserRepository } from './domain/port/repositories/user.repository.js';
import { UserMongoRepositoryAdapter } from './infrastructure/adapter/user-mongo-repository.adapter.js';
import { PasswordHasher } from './domain/port/password-hasher.js';
import { ScryptPasswordHasher } from './infrastructure/adapter/scrypt-password-hasher.js';
import { UserController } from './infrastructure/http/user.controller.js';
import { UserErrorFilter } from './infrastructure/http/user-error.filter.js';
import { APP_FILTER } from '@nestjs/core';
import {
  UserDocument,
  UserSchema,
} from './infrastructure/schemas/user.schema.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: UserDocument.name, schema: UserSchema },
    ]),
  ],
  controllers: [UserController, UserQueryController],
  providers: [
    { provide: UserReader, useExisting: UserRepository },
    {
      provide: GetUserUseCase,
      useFactory: (r: UserReader) => new GetUserUseCase(r),
      inject: [UserReader],
    },
    { provide: APP_FILTER, useClass: UserErrorFilter },
    { provide: PasswordHasher, useClass: ScryptPasswordHasher },
    {
      provide: CreateUserUseCase,
      useFactory: (repository: UserRepository, hasher: PasswordHasher) =>
        new CreateUserUseCase(
          repository,
          hasher,
          process.env.ALLOWED_EMAIL_DOMAIN ?? 'correounivalle.edu.co',
        ),
      inject: [UserRepository, PasswordHasher],
    },
    { provide: UserRepository, useClass: UserMongoRepositoryAdapter },
  ],
})
export class UserModule {}

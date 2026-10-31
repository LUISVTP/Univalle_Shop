import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CreateUserUseCase } from './application/use-cases/create-user.use-case.js';
import { UserRepository } from './domain/port/repositories/user.repository.js';
import { UserMongoRepositoryAdapter } from './infrastructure/adapter/user-mongo-repository.adapter.js';
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
  providers: [
    CreateUserUseCase,
    { provide: UserRepository, useClass: UserMongoRepositoryAdapter },
  ],
})
export class UserModule {}

import { Injectable } from '@nestjs/common';
import type { OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from '../../domain/entities/user.entity.js';
import { UserRepository } from '../../domain/port/repositories/user.repository.js';
import { EmailAlreadyExists } from '../../domain/errors.js';
import { UserDocument, UserHydratedDocument } from '../schemas/user.schema.js';

@Injectable()
export class UserMongoRepositoryAdapter
  implements UserRepository, OnModuleInit
{
  constructor(
    @InjectModel(UserDocument.name)
    private readonly userModel: Model<UserHydratedDocument>,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.userModel.init();
  }

  async SaveUser(user: User): Promise<User> {
    try {
      const created = await this.userModel.create({
        name: user.name,
        email: user.email,
        passwordHash: user.passwordHash,
      });

      return new User(
        created.name,
        created.email,
        created.passwordHash,
        created._id.toString(),
        created.createdAt,
      );
    } catch (error) {
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        error.code === 11000
      ) {
        throw new EmailAlreadyExists('El correo ya está registrado');
      }
      throw error;
    }
  }
}

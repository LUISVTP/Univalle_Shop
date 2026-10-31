import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from '../../domain/entities/user.entity.js';
import { UserRepository } from '../../domain/port/repositories/user.repository.js';
import { UserDocument, UserHydratedDocument } from '../schemas/user.schema.js';

@Injectable()
export class UserMongoRepositoryAdapter implements UserRepository {
  constructor(
    @InjectModel(UserDocument.name)
    private readonly userModel: Model<UserHydratedDocument>,
  ) {}

  async SaveUser(user: User): Promise<User> {
    const created = await this.userModel.create({
      name: user.name,
      email: user.email,
      password: user.password,
    });

    return new User(
      created.name,
      created.email,
      created.password,
      created._id.toString(),
      created.createdAt,
    );
  }
}

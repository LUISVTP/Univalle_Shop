import { Injectable } from '@nestjs/common';
import { User } from '../../domain/entities/user.entity.js';
import { UserRepository } from '../../domain/port/repositories/user.repository.js';

export interface CreateUserInput {
  name: string;
  email: string;
  password: string;
}

@Injectable()
export class CreateUserUseCase {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(input: CreateUserInput): Promise<User> {
    const user = new User(input.name, input.email, input.password);

    return this.userRepository.SaveUser(user);
  }
}

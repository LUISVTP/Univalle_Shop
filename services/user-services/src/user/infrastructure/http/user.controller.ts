import { Body, Controller, Inject, Post } from '@nestjs/common';
import { CreateUserUseCase } from '../../application/use-cases/create-user.use-case.js';
import type { CreateUserInput } from '../../application/use-cases/create-user.use-case.js';

@Controller('users')
export class UserController {
  constructor(
    @Inject(CreateUserUseCase) private readonly createUser: CreateUserUseCase,
  ) {}

  @Post()
  async create(@Body() input: CreateUserInput) {
    const user = await this.createUser.execute(input);
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
    };
  }
}

import { Controller, Get, Inject, Param } from '@nestjs/common';
import { GetUserUseCase } from '../../application/use-cases/get-user.use-case.js';
@Controller('users')
export class UserQueryController {
  constructor(
    @Inject(GetUserUseCase) private readonly getUser: GetUserUseCase,
  ) {}
  @Get(':id') get(@Param('id') id: string) {
    return this.getUser.execute(id);
  }
}

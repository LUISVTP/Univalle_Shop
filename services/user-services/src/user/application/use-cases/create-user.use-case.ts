import { User } from '../../domain/entities/user.entity.js';
import { UserRepository } from '../../domain/port/repositories/user.repository.js';
import { PasswordHasher } from '../../domain/port/password-hasher.js';
import { InvalidUser } from '../../domain/errors.js';

export interface CreateUserInput {
  name: string;
  email: string;
  password: string;
}

export class CreateUserUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly allowedEmailDomain: string,
  ) {}

  async execute(input: CreateUserInput): Promise<User> {
    if (
      !input ||
      typeof input.name !== 'string' ||
      typeof input.email !== 'string' ||
      typeof input.password !== 'string'
    )
      throw new InvalidUser('Nombre, correo y contraseña son obligatorios');
    const name = input.name.trim();
    const email = input.email.trim().toLowerCase();
    if (
      !name ||
      name.length > 100 ||
      email.length > 254 ||
      !/^[^\s@]+@[^\s@]+$/.test(email) ||
      email.split('@')[1] !== this.allowedEmailDomain ||
      input.password.length < 12 ||
      input.password.length > 128
    ) {
      throw new InvalidUser(
        'Usa nombre válido, correo institucional y contraseña de 12 a 128 caracteres',
      );
    }
    const user = new User(
      name,
      email,
      await this.passwordHasher.hash(input.password),
    );

    return this.userRepository.SaveUser(user);
  }
}

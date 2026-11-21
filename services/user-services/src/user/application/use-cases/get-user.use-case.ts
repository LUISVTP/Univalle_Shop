import { UserReader } from '../../domain/port/user-reader.js';
import { InvalidUser, UserNotFound } from '../../domain/errors.js';
export class GetUserUseCase {
  constructor(private readonly reader: UserReader) {}
  async execute(id: string) {
    if (!/^[a-f0-9]{24}$/i.test(id))
      throw new InvalidUser('Identificador inválido');
    const user = await this.reader.findById(id);
    if (!user) throw new UserNotFound('Usuario no encontrado');
    return user;
  }
}

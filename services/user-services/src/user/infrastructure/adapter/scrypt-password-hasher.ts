import { randomBytes, scrypt } from 'node:crypto';
import { promisify } from 'node:util';
import { PasswordHasher } from '../../domain/port/password-hasher.js';

const derive = promisify(scrypt);
export class ScryptPasswordHasher extends PasswordHasher {
  async hash(password: string): Promise<string> {
    const salt = randomBytes(16).toString('hex');
    const key = (await derive(password, salt, 64)) as Buffer;
    return `scrypt$${salt}$${key.toString('hex')}`;
  }
}

import { User } from '../../entities/user.entity.js';

export abstract class UserRepository {
  abstract SaveUser(user: User): Promise<User>;
}

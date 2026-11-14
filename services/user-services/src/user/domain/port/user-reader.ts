export interface UserProfile {
  id: string;
  name: string;
  email: string;
  createdAt?: Date;
}
export abstract class UserReader {
  abstract findById(id: string): Promise<UserProfile | null>;
}

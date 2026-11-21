export interface Preferences {
  userId: string;
  keywords: string[];
}
export abstract class PreferenceRepository {
  abstract find(userId: string): Promise<Preferences | null>;
  abstract save(preferences: Preferences): Promise<void>;
}
export abstract class UserReader {
  abstract exists(userId: string): Promise<void>;
}

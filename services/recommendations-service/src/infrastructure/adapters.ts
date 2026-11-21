import type { Connection } from 'mongoose';
import { PreferenceRepository, UserReader } from '../domain/preferences.js';
import type { Preferences } from '../domain/preferences.js';
import { getJson } from './http-json.js';
export class MongoPreferences extends PreferenceRepository {
  constructor(private readonly connection: Connection) {
    super();
  }
  private collection() {
    return this.connection.db!.collection<Preferences>('preferences');
  }
  async init() {
    await this.collection().createIndex({ userId: 1 }, { unique: true });
  }
  async find(userId: string) {
    return this.collection().findOne({ userId }, { projection: { _id: 0 } });
  }
  async save(preferences: Preferences) {
    await this.collection().updateOne(
      { userId: preferences.userId },
      { $set: preferences },
      { upsert: true },
    );
  }
}
export class HttpUsers extends UserReader {
  constructor(private readonly url: string) {
    super();
  }
  async exists(userId: string) {
    await getJson(this.url, `/users/${encodeURIComponent(userId)}`);
  }
}

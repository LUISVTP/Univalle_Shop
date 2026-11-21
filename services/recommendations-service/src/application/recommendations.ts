import { PreferenceRepository, UserReader } from '../domain/preferences.js';
import { CatalogReader, normalize } from '../domain/product.js';
import { DomainError, identifier } from '../domain/errors.js';
export class SavePreferences {
  constructor(
    private readonly repository: PreferenceRepository,
    private readonly users: UserReader,
  ) {}
  async execute(userId: string, input: { keywords: string[] }) {
    identifier(userId);
    if (
      !input ||
      !Array.isArray(input.keywords) ||
      input.keywords.length > 10 ||
      !input.keywords.every(
        (k) => typeof k === 'string' && k.trim().length >= 2 && k.length <= 40,
      )
    )
      throw new DomainError(
        'invalid',
        'Indica hasta diez intereses de 2 a 40 caracteres',
      );
    await this.users.exists(userId);
    const preferences = {
      userId,
      keywords: [...new Set(input.keywords.map(normalize))],
    };
    await this.repository.save(preferences);
    return preferences;
  }
}
export class RecommendProducts {
  constructor(
    private readonly repository: PreferenceRepository,
    private readonly catalog: CatalogReader,
    private readonly users: UserReader,
  ) {}
  async execute(userId: string) {
    identifier(userId);
    await this.users.exists(userId);
    const preferences = (await this.repository.find(userId)) ?? {
      userId,
      keywords: [],
    };
    const items = (await this.catalog.list())
      .filter((p) => p.stock > 0)
      .map((product) => {
        const matches = preferences.keywords.filter((word) =>
          normalize(product.name).includes(word),
        );
        return {
          ...product,
          score: matches.length,
          reason: matches.length
            ? `Coincide con: ${matches.join(', ')}`
            : 'Disponible para tu próxima compra',
        };
      })
      .sort(
        (a, b) =>
          b.score - a.score || a.price - b.price || a.id.localeCompare(b.id),
      )
      .slice(0, 6);
    return {
      preferences,
      items,
      strategy: preferences.keywords.length
        ? 'preferences'
        : 'available-products',
    };
  }
}

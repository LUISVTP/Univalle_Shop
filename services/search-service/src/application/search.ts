import { CatalogReader, normalize } from '../domain/product.js';
import { SearchIndex } from '../domain/search-index.js';
import { DomainError } from '../domain/errors.js';
export class SearchProducts {
  private lastSync = -Infinity;
  private syncing: Promise<void> | undefined;
  constructor(
    private readonly catalog: CatalogReader,
    private readonly index: SearchIndex,
    private readonly clock: () => number,
  ) {}
  async execute(input: { q?: string; maxPrice?: string }) {
    if (
      input.q !== undefined &&
      (typeof input.q !== 'string' || input.q.length > 100)
    )
      throw new DomainError('invalid', 'Búsqueda de máximo 100 caracteres');
    if (
      input.maxPrice !== undefined &&
      (typeof input.maxPrice !== 'string' ||
        !input.maxPrice.trim() ||
        !Number.isFinite(Number(input.maxPrice)) ||
        Number(input.maxPrice) < 0)
    )
      throw new DomainError('invalid', 'Precio máximo inválido');
    if (this.clock() - this.lastSync >= 30000) {
      this.syncing ??= this.sync();
      try {
        await this.syncing;
      } finally {
        this.syncing = undefined;
      }
    }
    const words = normalize(input.q ?? '')
      .split(/\s+/)
      .filter(Boolean);
    const items = await this.index.query(
      words,
      input.maxPrice === undefined ? undefined : Number(input.maxPrice),
    );
    return {
      items,
      count: items.length,
      indexedAt: new Date(this.lastSync).toISOString(),
    };
  }
  private async sync() {
    await this.index.upsert(await this.catalog.list());
    this.lastSync = this.clock();
  }
}

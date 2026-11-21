import { CatalogReader } from '../domain/product.js';
import type { Product } from '../domain/product.js';
import { DomainError } from '../domain/errors.js';
import { getJson } from './http-json.js';
export class HttpCatalog extends CatalogReader {
  constructor(private readonly url: string) {
    super();
  }
  async list(): Promise<Product[]> {
    const result = await getJson(this.url, '/products');
    if (
      !Array.isArray(result) ||
      !result.every(
        (p: Product) =>
          p &&
          typeof p.id === 'string' &&
          typeof p.name === 'string' &&
          Number.isFinite(p.price) &&
          Number.isInteger(p.stock),
      )
    )
      throw new DomainError('upstream', 'Contrato de catálogo inválido');
    return result;
  }
}

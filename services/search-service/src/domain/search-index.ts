import type { Product } from './product.js';
export abstract class SearchIndex {
  abstract upsert(products: Product[]): Promise<void>;
  abstract query(words: string[], maxPrice?: number): Promise<Product[]>;
}

import type { Connection } from 'mongoose';
import { SearchIndex } from '../domain/search-index.js';
import { normalize } from '../domain/product.js';
import type { Product } from '../domain/product.js';
type Entry = Product & { normalized: string };
export class MongoSearchIndex extends SearchIndex {
  constructor(private readonly connection: Connection) {
    super();
  }
  private collection() {
    return this.connection.db!.collection<Entry>('product_index');
  }
  async init() {
    await this.collection().createIndex({ id: 1 }, { unique: true });
  }
  async upsert(products: Product[]) {
    if (products.length)
      await this.collection().bulkWrite(
        products.map((p) => ({
          updateOne: {
            filter: { id: p.id },
            update: { $set: { ...p, normalized: normalize(p.name) } },
            upsert: true,
          },
        })),
      );
    await this.collection().deleteMany({
      id: { $nin: products.map((p) => p.id) },
    });
  }
  async query(words: string[], maxPrice?: number): Promise<Product[]> {
    // Escapar metacaracteres evita convertir la búsqueda del usuario en una expresión arbitraria.
    const terms = words.map((word) => ({
      normalized: { $regex: word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') },
    }));
    const rows = await this.collection()
      .find({
        ...(terms.length ? { $and: terms } : {}),
        ...(maxPrice === undefined ? {} : { price: { $lte: maxPrice } }),
      })
      .sort({ name: 1, id: 1 })
      .limit(100)
      .toArray();
    return rows.map(({ id, name, price, stock }) => ({
      id,
      name,
      price,
      stock,
    }));
  }
}

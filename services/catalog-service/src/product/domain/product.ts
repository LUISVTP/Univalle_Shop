export interface Product {
  id?: string;
  name: string;
  price: number;
  stock: number;
}
export abstract class ProductReader {
  abstract find(id: string): Promise<Product | null>;
}
export class ProductNotFound extends Error {}
export class InvalidProduct extends Error {}
export abstract class ProductRepository {
  abstract save(product: Product): Promise<Product>;
  abstract list(): Promise<Product[]>;
}

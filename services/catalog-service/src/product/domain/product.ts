export interface Product {
  id?: string;
  name: string;
  price: number;
  stock: number;
}
export class InvalidProduct extends Error {}
export abstract class ProductRepository {
  abstract save(product: Product): Promise<Product>;
  abstract list(): Promise<Product[]>;
}

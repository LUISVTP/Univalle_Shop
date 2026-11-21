export interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
}
export abstract class CatalogReader {
  abstract list(): Promise<Product[]>;
}
export function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

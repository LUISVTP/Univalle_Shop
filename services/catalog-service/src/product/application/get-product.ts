import {
  InvalidProduct,
  ProductNotFound,
  ProductReader,
} from '../domain/product.js';
export class GetProduct {
  constructor(private readonly reader: ProductReader) {}
  async execute(id: string) {
    if (!/^[a-f0-9]{24}$/i.test(id))
      throw new InvalidProduct('Identificador inválido');
    const product = await this.reader.find(id);
    if (!product) throw new ProductNotFound('Producto no encontrado');
    return product;
  }
}

import { InvalidProduct, ProductRepository } from "../domain/product.js";
import type { Product } from "../domain/product.js";

export class CreateProduct {
  constructor(private readonly repository: ProductRepository) {}
  execute(input: Omit<Product, "id">): Promise<Product> {
    if (
      !input ||
      typeof input.name !== "string" ||
      !input.name.trim() ||
      input.name.trim().length > 150 ||
      !Number.isFinite(input.price) ||
      input.price <= 0 ||
      !Number.isSafeInteger(input.stock) ||
      input.stock < 0
    ) {
      throw new InvalidProduct(
        "Nombre obligatorio, precio positivo y stock entero no negativo",
      );
    }
    return this.repository.save({
      name: input.name.trim(),
      price: input.price,
      stock: input.stock,
    });
  }
}
export class ListProducts {
  constructor(private readonly repository: ProductRepository) {}
  execute(): Promise<Product[]> {
    return this.repository.list();
  }
}

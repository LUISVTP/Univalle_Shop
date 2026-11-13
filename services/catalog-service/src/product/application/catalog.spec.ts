import { CreateProduct, ListProducts } from "./catalog.js";
import { InvalidProduct } from "../domain/product.js";

describe("Catalog application", () => {
  const save = vi.fn(async (product) => ({ ...product, id: "1" }));
  const list = vi.fn(async () => [
    { id: "1", name: "Libro", price: 12000, stock: 2 },
  ]);
  const create = new CreateProduct({ save, list });
  beforeEach(() => vi.clearAllMocks());
  it("crea y lista usando el puerto", async () => {
    expect(
      await create.execute({ name: " Libro ", price: 12000, stock: 2 }),
    ).toEqual({ id: "1", name: "Libro", price: 12000, stock: 2 });
    expect(await new ListProducts({ save, list }).execute()).toHaveLength(1);
  });
  it.each([
    { name: "", price: 1, stock: 0 },
    { name: "Libro", price: -1, stock: 0 },
    { name: "Libro", price: Number.NaN, stock: 0 },
    { name: "Libro", price: 1, stock: -1 },
    { name: "Libro", price: 1, stock: 1.5 },
  ])("rechaza productos inválidos", (input) => {
    expect(() => create.execute(input)).toThrow(InvalidProduct);
    expect(save).not.toHaveBeenCalled();
  });
});

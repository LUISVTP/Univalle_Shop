import { addToCart, cartTotal } from './cart';
const product = { id: 'a', name: 'Cuaderno', price: 12000, stock: 2 };
describe('carrito', () => {
  it('agrega e incrementa sin superar existencias', () => {
    let cart = addToCart([], product);
    cart = addToCart(cart, product);
    expect(cartTotal(cart)).toBe(24000);
    expect(() => addToCart(cart, product)).toThrow();
  });
  it('no agrega agotados ni modifica líneas con un pedido creado', () => {
    expect(addToCart([], { ...product, stock: 0 })).toEqual([]);
    expect(() =>
      addToCart([{ product, quantity: 1, orderId: 'pending' }], product),
    ).toThrow('pedido pendiente');
  });
});

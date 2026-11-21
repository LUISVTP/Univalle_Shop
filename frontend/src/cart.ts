import type { Product } from './api';
export interface CartLine {
  product: Product;
  quantity: number;
  orderId?: string;
}
export function addToCart(cart: CartLine[], product: Product): CartLine[] {
  if (product.stock < 1) return cart;
  const found = cart.find((line) => line.product.id === product.id);
  if (found?.orderId)
    throw new Error(
      'Este producto tiene un pedido pendiente. Termina su pago antes de cambiarlo.',
    );
  if (found && found.quantity >= Math.min(product.stock, 100))
    throw new Error('Alcanzaste la cantidad disponible');
  return found
    ? cart.map((line) =>
        line.product.id === product.id
          ? { ...line, quantity: line.quantity + 1 }
          : line,
      )
    : [...cart, { product, quantity: 1 }];
}
export function cartTotal(cart: CartLine[]): number {
  return cart.reduce(
    (sum, line) => sum + line.product.price * line.quantity,
    0,
  );
}
export function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

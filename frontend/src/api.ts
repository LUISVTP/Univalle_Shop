export interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  reason?: string;
}
export interface Profile {
  id: string;
  name: string;
  email: string;
}
export interface Order {
  id: string;
  productName: string;
  quantity: number;
  total: number;
  status: string;
  createdAt: string;
}
export interface Payment {
  id: string;
  orderId: string;
  amount: number;
  status: 'approved' | 'declined';
  simulated: true;
}
export async function api<T>(
  path: string,
  body?: unknown,
  signal?: AbortSignal,
): Promise<T> {
  const response = await fetch(`/api${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: signal ?? AbortSignal.timeout(15000),
  });
  const data = await response.json();
  if (!response.ok)
    throw new Error(
      typeof data.message === 'string'
        ? data.message
        : `Error ${response.status}`,
    );
  return data as T;
}
export const money = (value: number) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(value);

import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import App from './App';
import { api } from './api';
vi.mock('./api', async (original) => ({
  ...(await original<typeof import('./api')>()),
  api: vi.fn(),
}));
const request = vi.mocked(api);
const product = {
  id: 'a'.repeat(24),
  name: 'Cuaderno de cálculo',
  price: 12000,
  stock: 3,
};
beforeEach(() => {
  localStorage.clear();
  vi.resetAllMocks();
  request.mockResolvedValue([product]);
});
afterEach(cleanup);
it('muestra el catálogo y agrega productos al carrito', async () => {
  const user = userEvent.setup();
  render(<App />);
  await user.click(
    await screen.findByRole('button', { name: 'Agregar Cuaderno de cálculo' }),
  );
  await user.click(screen.getByRole('button', { name: 'Carrito 1' }));
  expect(screen.getByRole('dialog', { name: 'Tu carrito' })).toBeTruthy();
  expect(
    screen.getByRole('button', { name: 'Continuar con mi perfil' }),
  ).toBeTruthy();
});
it('comunica un fallo de API y ofrece reintentar', async () => {
  request.mockRejectedValue(new Error('Servicio no disponible'));
  render(<App />);
  expect(await screen.findByRole('alert')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Reintentar' })).toBeTruthy();
});
it('procesa un pedido y su pago simulado con una clave estable', async () => {
  const user = userEvent.setup();
  localStorage.setItem(
    'uv-profile',
    JSON.stringify({
      id: 'b'.repeat(24),
      name: 'Ana',
      email: 'ana@correounivalle.edu.co',
    }),
  );
  const order = {
    id: '11111111-1111-4111-8111-111111111111',
    productName: product.name,
    total: 12000,
    quantity: 1,
    status: 'created',
    createdAt: '2026-11-20T12:00:00Z',
  };
  request.mockImplementation(async (path) => {
    if (path === '/products') return [product];
    if (path.startsWith('/recommendations/'))
      return { items: [], preferences: { keywords: [] } };
    if (path === '/orders') return order;
    if (path === '/payments')
      return {
        id: 'payment',
        orderId: order.id,
        amount: 12000,
        status: 'approved',
        simulated: true,
      };
    throw new Error(path);
  });
  render(<App />);
  await user.click(
    await screen.findByRole('button', { name: 'Agregar Cuaderno de cálculo' }),
  );
  await user.click(screen.getByRole('button', { name: 'Carrito 1' }));
  await user.click(
    screen.getByRole('button', { name: 'Confirmar compra simulada' }),
  );
  await waitFor(() =>
    expect(screen.getByText('Pago simulado aprobado')).toBeTruthy(),
  );
  expect(request).toHaveBeenCalledWith('/payments', {
    orderId: order.id,
    idempotencyKey: `checkout_${order.id}`,
  });
  expect(JSON.parse(localStorage.getItem('uv-cart')!)).toEqual([]);
});

it('permite cancelar un pedido cuyo pago simulado fue rechazado', async () => {
  const user = userEvent.setup();
  const order = {
    id: '11111111-1111-4111-8111-111111111111',
    productName: product.name,
    total: 12000,
    quantity: 1,
    status: 'created',
    createdAt: '2026-11-20T12:00:00Z',
  };
  localStorage.setItem(
    'uv-receipts',
    JSON.stringify([
      {
        order,
        payment: {
          id: 'declined',
          orderId: order.id,
          status: 'declined',
          simulated: true,
        },
      },
    ]),
  );
  localStorage.setItem(
    'uv-cart',
    JSON.stringify([{ product, quantity: 1, orderId: order.id }]),
  );
  request.mockImplementation(async (path) =>
    path.endsWith('/cancel') ? { ...order, status: 'cancelled' } : [product],
  );
  render(<App />);
  await user.click(
    screen.getByRole('button', { name: 'Mis pedidos' }),
  );
  await user.click(
    screen.getByRole('button', { name: 'Cancelar pedido' }),
  );
  await waitFor(() =>
    expect(screen.getByText('Cancelado', { exact: true })).toBeTruthy(),
  );
  expect(JSON.parse(localStorage.getItem('uv-cart')!)).toEqual([]);
});

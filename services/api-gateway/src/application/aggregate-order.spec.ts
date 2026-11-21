import { AggregateOrder } from './aggregate-order.js';
import { ServiceUnavailable } from '../domain/service-client.js';
describe('Aggregator de pedido', () => {
  it('combina tres respuestas y conserva precio histórico', async () => {
    const request = vi.fn(async (service: string) => ({
      status: 200,
      body:
        service === 'orders'
          ? { id: 'o', userId: 'u', productId: 'p', unitPrice: 10 }
          : service === 'users'
            ? { id: 'u', name: 'Ana' }
            : { id: 'p', price: 12 },
    }));
    const result = await new AggregateOrder({ request }).execute('o');
    expect(result).toEqual({
      status: 200,
      body: {
        order: { id: 'o', userId: 'u', productId: 'p', unitPrice: 10 },
        user: { id: 'u', name: 'Ana' },
        product: { id: 'p', price: 12 },
      },
    });
    expect(request).toHaveBeenCalledTimes(3);
  });
  it('no consulta otros servicios si el pedido aún no está en la proyección', async () => {
    const request = vi.fn(async () => ({
      status: 404,
      body: { message: 'pendiente' },
    }));
    expect((await new AggregateOrder({ request }).execute('o')).status).toBe(
      404,
    );
    expect(request).toHaveBeenCalledTimes(1);
  });
  it('no devuelve resumen incompleto si falta un destino', async () => {
    const request = vi.fn(async (service: string) =>
      service === 'orders'
        ? { status: 200, body: { userId: 'u', productId: 'p' } }
        : { status: 503, body: {} },
    );
    await expect(
      new AggregateOrder({ request }).execute('o'),
    ).rejects.toBeInstanceOf(ServiceUnavailable);
  });
});

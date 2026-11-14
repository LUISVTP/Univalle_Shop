import { ServiceClient, ServiceUnavailable } from '../domain/service-client.js';
export class AggregateOrder {
  constructor(private readonly client: ServiceClient) {}
  async execute(id: string) {
    const order = await this.client.request(
      'orders',
      'GET',
      `/orders/${encodeURIComponent(id)}`,
    );
    if (order.status !== 200) return order;
    const state = order.body as Record<string, unknown>;
    if (typeof state.userId !== 'string' || typeof state.productId !== 'string')
      throw new ServiceUnavailable('Pedido inválido');
    const [user, product] = await Promise.all([
      this.client.request(
        'users',
        'GET',
        `/users/${encodeURIComponent(state.userId)}`,
      ),
      this.client.request(
        'catalog',
        'GET',
        `/products/${encodeURIComponent(state.productId)}`,
      ),
    ]);
    if (user.status !== 200 || product.status !== 200)
      throw new ServiceUnavailable('No fue posible completar el resumen');
    // order contiene precio histórico; product contiene los datos actuales del catálogo.
    return {
      status: 200,
      body: { order: order.body, user: user.body, product: product.body },
    };
  }
}

import { GetProductActivity, RecordOrderActivity } from './activity.js';
describe('Proyección de actividad del catálogo', () => {
  it('recibe por puerto y calcula cantidades activas/canceladas', async () => {
    const rows = [
      {
        orderId: '1',
        productId: 'p',
        quantity: 2,
        status: 'created' as const,
        version: 1,
      },
      {
        orderId: '2',
        productId: 'p',
        quantity: 3,
        status: 'cancelled' as const,
        version: 2,
      },
    ];
    const apply = vi.fn(async () => {});
    const repository = { apply, forProduct: async () => rows };
    await new RecordOrderActivity(repository).execute(rows[0]!);
    expect(apply).toHaveBeenCalledWith(rows[0]);
    expect(await new GetProductActivity(repository).execute('p')).toEqual({
      productId: 'p',
      createdOrders: 2,
      activeQuantity: 2,
      cancelledOrders: 1,
    });
  });
});

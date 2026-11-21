import { CreatePayment, GetPayment } from './payments.js';
import type {
  Payment,
  PaymentRepository,
  OrderForPayment,
} from '../domain/payment.js';
const orderId = '11111111-1111-4111-8111-111111111111';
describe('pagos simulados', () => {
  let payments: Payment[];
  let repository: PaymentRepository;
  let orders: {
    find: ReturnType<typeof vi.fn<(id: string) => Promise<OrderForPayment>>>;
  };
  let processor: {
    authorize: ReturnType<typeof vi.fn<() => Promise<'approved' | 'declined'>>>;
  };
  let create: CreatePayment;
  beforeEach(() => {
    payments = [];
    repository = {
      byOrder: async (id) => payments.find((p) => p.orderId === id) ?? null,
      find: async (id) => payments.find((p) => p.id === id) ?? null,
      save: async (p) => {
        payments.push(p);
        return p;
      },
    };
    orders = {
      find: vi
        .fn()
        .mockResolvedValue({
          id: orderId,
          userId: 'a'.repeat(24),
          total: 12500,
          status: 'created',
        }),
    };
    processor = { authorize: vi.fn().mockResolvedValue('approved') };
    create = new CreatePayment(
      repository,
      orders,
      processor,
      () => orderId,
      () => '2026-11-20T12:00:00Z',
    );
  });
  it('obtiene el importe del pedido e ignora un importe enviado por el cliente', async () => {
    const payment = await create.execute({
      orderId,
      idempotencyKey: 'demo_key_1',
      amount: 1,
    } as Parameters<CreatePayment['execute']>[0]);
    expect(payment).toMatchObject({
      amount: 12500,
      currency: 'COP',
      simulated: true,
      status: 'approved',
    });
  });
  it('reintenta sin autorizar ni guardar dos veces', async () => {
    const first = await create.execute({
      orderId,
      idempotencyKey: 'demo_key_1',
    });
    expect(
      await create.execute({ orderId, idempotencyKey: 'demo_key_1' }),
    ).toEqual(first);
    expect(processor.authorize).toHaveBeenCalledTimes(1);
    expect(payments).toHaveLength(1);
    await expect(
      create.execute({ orderId, idempotencyKey: 'different_key' }),
    ).rejects.toMatchObject({ code: 'conflict' });
  });
  it('rechaza pedidos cancelados antes de autorizar', async () => {
    orders.find.mockResolvedValue({
      id: orderId,
      userId: 'a'.repeat(24),
      total: 12000,
      status: 'cancelled',
    });
    await expect(
      create.execute({ orderId, idempotencyKey: 'demo_key_1' }),
    ).rejects.toMatchObject({ code: 'conflict' });
    expect(processor.authorize).not.toHaveBeenCalled();
  });
  it('valida la entrada y el total', async () => {
    await expect(
      create.execute({ orderId: 'invalid', idempotencyKey: 'short' }),
    ).rejects.toMatchObject({ code: 'invalid' });
    orders.find.mockResolvedValue({
      id: orderId,
      userId: 'a'.repeat(24),
      total: 0,
      status: 'created',
    });
    await expect(
      create.execute({ orderId, idempotencyKey: 'demo_key_1' }),
    ).rejects.toMatchObject({ code: 'invalid' });
  });
  it('conserva el rechazo del simulador y responde 404 para transacciones ausentes', async () => {
    processor.authorize.mockResolvedValue('declined');
    expect(
      (await create.execute({ orderId, idempotencyKey: 'demo_key_1' })).status,
    ).toBe('declined');
    await expect(
      new GetPayment(repository).execute(
        '22222222-2222-4222-8222-222222222222',
      ),
    ).rejects.toMatchObject({ code: 'missing' });
  });
});

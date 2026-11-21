import {
  CancelOrder,
  CreateOrder,
  GetOrder,
  RebuildOrder,
  RelayOutbox,
} from './orders.js';
import {
  InvalidOrder,
  OrderConflict,
  OrderNotFound,
  replay,
} from '../domain/order.js';
import type { OrderEvent } from '../domain/order.js';
import { parseOrderEvent } from '../../messaging/order-event.contract.js';

describe('Orders: comandos, eventos, consultas y outbox', () => {
  let events: OrderEvent[];
  const product = { id: 'b'.repeat(24), name: 'Libro', price: 12000, stock: 5 };
  const input = { userId: 'a'.repeat(24), productId: product.id, quantity: 2 };
  const now = () => '2026-11-13T12:00:00.000Z';
  let sequence = 0;
  const id = () => `id-${++sequence}`;
  const append = vi.fn(async (event: OrderEvent) => {
    events.push(event);
  });
  const store = { append, load: vi.fn(async () => events) };
  const facts = {
    userExists: vi.fn(async () => {}),
    product: vi.fn(async () => product),
  };
  const create = new CreateOrder(store, facts, id, now);
  beforeEach(() => {
    events = [];
    sequence = 0;
    vi.clearAllMocks();
  });
  it('consulta referencias antes de persistir el evento', async () => {
    const state = await create.execute(input);
    expect(facts.userExists.mock.invocationCallOrder[0]).toBeLessThan(
      facts.product.mock.invocationCallOrder[0]!,
    );
    expect(facts.product.mock.invocationCallOrder[0]).toBeLessThan(
      append.mock.invocationCallOrder[0]!,
    );
    expect(state.total).toBe(24000);
    expect(replay(events)).toEqual(state);
    expect(parseOrderEvent(events[0])).toEqual(events[0]);
  });
  it.each([0, -1, 1.5, 101])(
    'rechaza cantidad %s sin consultar servicios',
    async (quantity) => {
      await expect(
        create.execute({ ...input, quantity }),
      ).rejects.toBeInstanceOf(InvalidOrder);
      expect(facts.userExists).not.toHaveBeenCalled();
      expect(append).not.toHaveBeenCalled();
    },
  );
  it('rechaza stock insuficiente', async () => {
    await expect(
      create.execute({ ...input, quantity: 6 }),
    ).rejects.toBeInstanceOf(InvalidOrder);
    expect(append).not.toHaveBeenCalled();
  });
  it('no guarda si falla el servicio de usuarios', async () => {
    facts.userExists.mockRejectedValueOnce(new Error('offline'));
    await expect(create.execute(input)).rejects.toThrow('offline');
    expect(facts.product).not.toHaveBeenCalled();
    expect(append).not.toHaveBeenCalled();
  });
  it('reconstruye estado cancelado y rechaza segunda cancelación', async () => {
    const state = await create.execute(input);
    const cancel = new CancelOrder(store, id, now);
    await cancel.execute(state.id, { reason: 'Cambio de decisión' });
    expect(events.map((e) => e.type)).toEqual([
      'OrderCreated',
      'OrderCancelled',
    ]);
    expect(replay(events).status).toBe('cancelled');
    expect(replay(events).version).toBe(2);
    await expect(
      cancel.execute(state.id, { reason: 'otra' }),
    ).rejects.toBeInstanceOf(OrderConflict);
    expect(events).toHaveLength(2);
  });
  it('detecta huecos y orden incorrecto en event sourcing', async () => {
    const state = await create.execute(input);
    await new CancelOrder(store, id, now).execute(state.id, {
      reason: 'Prueba',
    });
    expect(() => replay([events[1]!])).toThrow(OrderConflict);
    expect(() => replay([...events].reverse())).toThrow(OrderConflict);
    expect(() => replay([])).toThrow(OrderNotFound);
  });
  it('consulta solamente el modelo de lectura', async () => {
    const state = await create.execute(input);
    const find = vi.fn(async () => state);
    const views = { find, project: vi.fn(), rebuild: vi.fn() };
    expect(await new GetOrder(views).execute(state.id)).toEqual(state);
    expect(store.load).not.toHaveBeenCalled();
  });
  it('reconstruye proyección desde eventos sin llamar a otros servicios', async () => {
    const state = await create.execute(input);
    vi.clearAllMocks();
    const rebuild = vi.fn(async () => {});
    await new RebuildOrder(store, {
      find: vi.fn(),
      project: vi.fn(),
      rebuild,
    }).execute(state.id);
    expect(rebuild).toHaveBeenCalledWith(state);
    expect(facts.product).not.toHaveBeenCalled();
  });
  it('publica antes de marcar entregado', async () => {
    await create.execute(input);
    const publish = vi.fn(async () => {});
    const delivered = vi.fn(async () => {});
    expect(
      await new RelayOutbox(
        { pending: async () => events, delivered },
        { publish },
      ).execute(),
    ).toBe(1);
    expect(publish.mock.invocationCallOrder[0]).toBeLessThan(
      delivered.mock.invocationCallOrder[0]!,
    );
  });
  it('conserva pendiente si falla la publicación', async () => {
    await create.execute(input);
    const delivered = vi.fn(async () => {});
    const relay = new RelayOutbox(
      { pending: async () => events, delivered },
      {
        publish: async () => {
          throw new Error('broker down');
        },
      },
    );
    await expect(relay.execute()).rejects.toThrow('broker down');
    expect(delivered).not.toHaveBeenCalled();
  });
  it('un fallo después de publicar requiere tolerar reentrega', async () => {
    await create.execute(input);
    const publish = vi.fn(async () => {});
    const delivered = vi
      .fn(async () => {})
      .mockRejectedValueOnce(new Error('crash'));
    const relay = new RelayOutbox(
      { pending: async () => events, delivered },
      { publish },
    );
    await expect(relay.execute()).rejects.toThrow('crash');
    await relay.execute();
    expect(publish).toHaveBeenCalledTimes(2);
  });
  it('rechaza un evento con versión de contrato desconocida', async () => {
    await create.execute(input);
    expect(() => parseOrderEvent({ ...events[0], schemaVersion: 2 })).toThrow(
      'Contrato',
    );
  });
});

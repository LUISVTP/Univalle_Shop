import {
  InvalidOrder,
  OrderConflict,
  OrderNotFound,
  replay,
} from '../domain/order.js';
import type { OrderState } from '../domain/order.js';
import {
  OrderEventStore,
  OrderFacts,
  OrderViews,
  Outbox,
  EventPublisher,
} from '../domain/ports.js';

export interface CreateOrderInput {
  userId: string;
  productId: string;
  quantity: number;
}
export class CreateOrder {
  constructor(
    private readonly store: OrderEventStore,
    private readonly facts: OrderFacts,
    private readonly id: () => string,
    private readonly now: () => string,
  ) {}
  async execute(input: CreateOrderInput): Promise<OrderState> {
    if (
      !input ||
      typeof input.userId !== 'string' ||
      !/^[a-f0-9]{24}$/i.test(input.userId) ||
      typeof input.productId !== 'string' ||
      !/^[a-f0-9]{24}$/i.test(input.productId) ||
      !Number.isSafeInteger(input.quantity) ||
      input.quantity < 1 ||
      input.quantity > 100
    ) {
      throw new InvalidOrder(
        'Usuario y producto válidos; cantidad entera entre 1 y 100',
      );
    }
    // Chained: el comando consulta usuarios y luego catálogo mediante sus APIs.
    await this.facts.userExists(input.userId);
    const product = await this.facts.product(input.productId);
    if (product.stock < input.quantity)
      throw new InvalidOrder('Cantidad superior al stock consultado');
    const total = product.price * input.quantity;
    if (!Number.isFinite(total)) throw new InvalidOrder('Total inválido');
    const state: OrderState = {
      id: this.id(),
      userId: input.userId,
      productId: product.id,
      productName: product.name,
      quantity: input.quantity,
      unitPrice: product.price,
      total,
      status: 'created',
      version: 1,
      createdAt: this.now(),
    };
    await this.store.append({
      id: this.id(),
      aggregateId: state.id,
      version: 1,
      schemaVersion: 1,
      occurredAt: state.createdAt,
      type: 'OrderCreated',
      data: state,
    });
    return state;
  }
}
export class CancelOrder {
  constructor(
    private readonly store: OrderEventStore,
    private readonly id: () => string,
    private readonly now: () => string,
  ) {}
  async execute(
    orderId: string,
    input: { reason: string },
  ): Promise<OrderState> {
    if (
      !input ||
      typeof input.reason !== 'string' ||
      !input.reason.trim() ||
      input.reason.length > 250
    ) {
      throw new InvalidOrder(
        'Motivo de cancelación obligatorio (máximo 250 caracteres)',
      );
    }
    const current = replay(await this.store.load(orderId));
    if (current.status !== 'created')
      throw new OrderConflict('El pedido ya está cancelado');
    const next: OrderState = {
      ...current,
      version: current.version + 1,
      status: 'cancelled',
      cancellationReason: input.reason.trim(),
    };
    await this.store.append({
      id: this.id(),
      aggregateId: orderId,
      version: next.version,
      schemaVersion: 1,
      occurredAt: this.now(),
      type: 'OrderCancelled',
      data: next,
    });
    return next;
  }
}
export class GetOrder {
  constructor(private readonly views: OrderViews) {}
  async execute(id: string) {
    const state = await this.views.find(id);
    if (!state)
      throw new OrderNotFound(
        'Pedido ausente en la proyección; si acaba de crearlo, reintente',
      );
    return state;
  }
}
export class GetOrderEvents {
  constructor(private readonly store: OrderEventStore) {}
  async execute(id: string) {
    const events = await this.store.load(id);
    if (!events.length) throw new OrderNotFound('Pedido no encontrado');
    return events;
  }
}
export class RebuildOrder {
  constructor(
    private readonly store: OrderEventStore,
    private readonly views: OrderViews,
  ) {}
  async execute(id: string) {
    const state = replay(await this.store.load(id));
    await this.views.rebuild(state);
    return state;
  }
}
export class RelayOutbox {
  constructor(
    private readonly outbox: Outbox,
    private readonly publisher: EventPublisher,
  ) {}
  async execute(): Promise<number> {
    let count = 0;
    for (const event of await this.outbox.pending()) {
      await this.publisher.publish(event);
      await this.outbox.delivered(event.id);
      count++;
    }
    return count;
  }
}

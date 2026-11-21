export class InvalidOrder extends Error {}
export class OrderNotFound extends Error {}
export class OrderConflict extends Error {}
export class ReferenceNotFound extends Error {}
export class DependencyUnavailable extends Error {}

export interface OrderState {
  id: string;
  userId: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
  status: 'created' | 'cancelled';
  version: number;
  createdAt: string;
  cancellationReason?: string;
}
export interface OrderEvent {
  id: string;
  aggregateId: string;
  version: number;
  schemaVersion: 1;
  occurredAt: string;
  type: 'OrderCreated' | 'OrderCancelled';
  data: OrderState;
}
export function evolve(
  state: OrderState | null,
  event: OrderEvent,
): OrderState {
  if (
    event.schemaVersion !== 1 ||
    event.version !== (state?.version ?? 0) + 1 ||
    (state && event.aggregateId !== state.id) ||
    event.data.id !== event.aggregateId ||
    event.data.version !== event.version
  )
    throw new OrderConflict('Secuencia de eventos inválida');
  if (
    event.type === 'OrderCreated' &&
    !state &&
    event.data.status === 'created'
  )
    return { ...event.data };
  if (
    event.type === 'OrderCancelled' &&
    state?.status === 'created' &&
    event.data.status === 'cancelled'
  ) {
    return {
      ...state,
      status: 'cancelled',
      version: event.version,
      cancellationReason: event.data.cancellationReason,
    };
  }
  throw new OrderConflict('Transición de pedido inválida');
}
export function replay(events: OrderEvent[]): OrderState {
  let state: OrderState | null = null;
  for (const event of events) state = evolve(state, event);
  if (!state) throw new OrderNotFound('Pedido no encontrado');
  return state;
}

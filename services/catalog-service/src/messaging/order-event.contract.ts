export interface OrderIntegrationEvent {
  id: string;
  aggregateId: string;
  version: number;
  schemaVersion: 1;
  occurredAt: string;
  type: 'OrderCreated' | 'OrderCancelled';
  data: {
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
  };
}
export function parseOrderEvent(raw: unknown): OrderIntegrationEvent {
  if (!raw || typeof raw !== 'object') throw new Error('Evento inválido');
  const e = raw as OrderIntegrationEvent;
  const d = e.data;
  if (
    e.schemaVersion !== 1 ||
    typeof e.id !== 'string' ||
    !e.id ||
    typeof e.aggregateId !== 'string' ||
    !e.aggregateId ||
    !Number.isSafeInteger(e.version) ||
    typeof e.occurredAt !== 'string' ||
    !Number.isFinite(Date.parse(e.occurredAt)) ||
    !d ||
    d.id !== e.aggregateId ||
    d.version !== e.version ||
    typeof d.userId !== 'string' ||
    typeof d.productId !== 'string' ||
    typeof d.productName !== 'string' ||
    typeof d.createdAt !== 'string' ||
    !Number.isSafeInteger(d.quantity) ||
    d.quantity < 1 ||
    !Number.isFinite(d.unitPrice) ||
    d.unitPrice <= 0 ||
    !Number.isFinite(d.total) ||
    d.total !== d.quantity * d.unitPrice ||
    !(
      (e.type === 'OrderCreated' &&
        e.version === 1 &&
        d.status === 'created') ||
      (e.type === 'OrderCancelled' &&
        e.version === 2 &&
        d.status === 'cancelled' &&
        typeof d.cancellationReason === 'string')
    )
  ) {
    throw new Error('Contrato de evento orders v1 incumplido');
  }
  return e;
}

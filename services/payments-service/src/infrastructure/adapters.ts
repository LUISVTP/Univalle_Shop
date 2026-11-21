import {
  PaymentRepository,
  OrderReader,
  PaymentProcessor,
} from '../domain/payment.js';
import type { Payment, OrderForPayment } from '../domain/payment.js';
import { DomainError } from '../domain/errors.js';
import type { Connection } from 'mongoose';
import { getJson } from './http-json.js';
export class MongoPayments extends PaymentRepository {
  constructor(private readonly connection: Connection) {
    super();
  }
  private collection() {
    return this.connection.db!.collection<Payment>('payments');
  }
  async init() {
    await this.collection().createIndex({ orderId: 1 }, { unique: true });
  }
  async byOrder(orderId: string) {
    return this.collection().findOne({ orderId }, { projection: { _id: 0 } });
  }
  async find(id: string) {
    return this.collection().findOne({ id }, { projection: { _id: 0 } });
  }
  async save(payment: Payment): Promise<Payment> {
    try {
      await this.collection().insertOne({ ...payment });
      return payment;
    } catch (error) {
      if ((error as { code?: number }).code !== 11000) throw error;
      const existing = await this.byOrder(payment.orderId);
      if (existing?.idempotencyKey === payment.idempotencyKey) return existing;
      throw new DomainError('conflict', 'El pedido ya tiene una transacción');
    }
  }
}
export class HttpOrders extends OrderReader {
  constructor(private readonly url: string) {
    super();
  }
  async find(id: string): Promise<OrderForPayment> {
    // Consultar eventos evita depender del retraso de la vista CQRS.
    const events = await getJson(
      this.url,
      `/orders/${encodeURIComponent(id)}/events`,
    );
    if (!Array.isArray(events) || !events.length)
      throw new DomainError('upstream', 'Historial de pedido inválido');
    const last = events.at(-1) as { data?: OrderForPayment };
    if (
      !last.data ||
      last.data.id !== id ||
      typeof last.data.total !== 'number' ||
      typeof last.data.userId !== 'string'
    )
      throw new DomainError('upstream', 'Contrato de pedido inválido');
    return last.data;
  }
}
export class SimulatedProcessor extends PaymentProcessor {
  constructor(private readonly outcome: 'approved' | 'declined') {
    super();
  }
  authorize() {
    return Promise.resolve(this.outcome);
  }
}

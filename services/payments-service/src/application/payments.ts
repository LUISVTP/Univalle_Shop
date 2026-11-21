import { DomainError } from '../domain/errors.js';
import {
  PaymentRepository,
  OrderReader,
  PaymentProcessor,
} from '../domain/payment.js';
import type { Payment } from '../domain/payment.js';
export class CreatePayment {
  constructor(
    private readonly repository: PaymentRepository,
    private readonly orders: OrderReader,
    private readonly processor: PaymentProcessor,
    private readonly id: () => string,
    private readonly now: () => string,
  ) {}
  async execute(input: {
    orderId: string;
    idempotencyKey: string;
  }): Promise<Payment> {
    if (
      !input ||
      typeof input.orderId !== 'string' ||
      !/^[a-f0-9-]{36}$/i.test(input.orderId) ||
      typeof input.idempotencyKey !== 'string' ||
      !/^[a-zA-Z0-9_-]{8,100}$/.test(input.idempotencyKey)
    )
      throw new DomainError(
        'invalid',
        'Pedido UUID y clave de idempotencia de 8 a 100 caracteres obligatorios',
      );
    const previous = await this.repository.byOrder(input.orderId);
    if (previous) {
      if (previous.idempotencyKey !== input.idempotencyKey)
        throw new DomainError('conflict', 'El pedido ya tiene una transacción');
      return previous;
    }
    const order = await this.orders.find(input.orderId);
    if (order.status !== 'created')
      throw new DomainError(
        'conflict',
        'No se puede pagar un pedido cancelado',
      );
    if (!Number.isFinite(order.total) || order.total <= 0)
      throw new DomainError('invalid', 'El total debe ser positivo');
    // El importe procede de pedidos; el cliente nunca decide cuánto paga.
    const payment: Payment = {
      id: this.id(),
      orderId: order.id,
      userId: order.userId,
      amount: order.total,
      currency: 'COP',
      status: await this.processor.authorize(),
      simulated: true,
      idempotencyKey: input.idempotencyKey,
      createdAt: this.now(),
    };
    return this.repository.save(payment);
  }
}
export class GetPayment {
  constructor(private readonly repository: PaymentRepository) {}
  async execute(id: string) {
    if (!/^[a-f0-9-]{36}$/i.test(id))
      throw new DomainError('invalid', 'Identificador de transacción inválido');
    const payment = await this.repository.find(id);
    if (!payment) throw new DomainError('missing', 'Transacción no encontrada');
    return payment;
  }
}

export interface OrderForPayment {
  id: string;
  userId: string;
  total: number;
  status: string;
}
export interface Payment {
  id: string;
  orderId: string;
  userId: string;
  amount: number;
  currency: 'COP';
  status: 'approved' | 'declined';
  simulated: true;
  idempotencyKey: string;
  createdAt: string;
}
export abstract class PaymentRepository {
  abstract byOrder(orderId: string): Promise<Payment | null>;
  abstract find(id: string): Promise<Payment | null>;
  abstract save(payment: Payment): Promise<Payment>;
}
export abstract class OrderReader {
  abstract find(id: string): Promise<OrderForPayment>;
}
export abstract class PaymentProcessor {
  abstract authorize(): Promise<'approved' | 'declined'>;
}

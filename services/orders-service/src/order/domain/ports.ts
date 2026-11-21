import type { OrderEvent, OrderState } from './order.js';

export abstract class OrderEventStore {
  abstract append(event: OrderEvent): Promise<void>;
  abstract load(orderId: string): Promise<OrderEvent[]>;
}
export abstract class OrderViews {
  abstract find(orderId: string): Promise<OrderState | null>;
  abstract project(event: OrderEvent): Promise<void>;
  abstract rebuild(state: OrderState): Promise<void>;
}
export abstract class OrderFacts {
  abstract userExists(userId: string): Promise<void>;
  abstract product(
    productId: string,
  ): Promise<{ id: string; name: string; price: number; stock: number }>;
}
export abstract class Outbox {
  abstract pending(): Promise<OrderEvent[]>;
  abstract delivered(eventId: string): Promise<void>;
}
export abstract class EventPublisher {
  abstract publish(event: OrderEvent): Promise<void>;
}

import { randomUUID } from 'node:crypto';
import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import {
  CancelOrder,
  CreateOrder,
  GetOrder,
  GetOrderEvents,
  RebuildOrder,
  RelayOutbox,
} from './application/orders.js';
import {
  EventPublisher,
  OrderEventStore,
  OrderFacts,
  OrderViews,
  Outbox,
} from './domain/ports.js';
import {
  MongoOrderStore,
  MongoOrderViews,
} from './infrastructure/mongo-order-store.js';
import { HttpOrderFacts } from './infrastructure/http-order-facts.js';
import {
  OrderController,
  OrderErrorFilter,
} from './infrastructure/order.controller.js';
import {
  BrokerEventPublisher,
  OrderWorkers,
} from './infrastructure/order-workers.js';
import { BrokerTransport } from '../messaging/broker-transport.js';
const clock = () => new Date().toISOString();
@Module({
  controllers: [OrderController],
  providers: [
    MongoOrderStore,
    { provide: OrderEventStore, useExisting: MongoOrderStore },
    { provide: Outbox, useExisting: MongoOrderStore },
    { provide: OrderViews, useClass: MongoOrderViews },
    {
      provide: OrderFacts,
      useFactory: () =>
        new HttpOrderFacts(
          process.env.USERS_SERVICE_URL ?? 'http://127.0.0.1:3001',
          process.env.CATALOG_SERVICE_URL ?? 'http://127.0.0.1:3002',
        ),
    },
    {
      provide: BrokerTransport,
      useFactory: () => new BrokerTransport('orders-read-model-v1'),
    },
    {
      provide: EventPublisher,
      useFactory: (bus: BrokerTransport) => new BrokerEventPublisher(bus),
      inject: [BrokerTransport],
    },
    {
      provide: CreateOrder,
      useFactory: (s: OrderEventStore, f: OrderFacts) =>
        new CreateOrder(s, f, randomUUID, clock),
      inject: [OrderEventStore, OrderFacts],
    },
    {
      provide: CancelOrder,
      useFactory: (s: OrderEventStore) => new CancelOrder(s, randomUUID, clock),
      inject: [OrderEventStore],
    },
    {
      provide: GetOrder,
      useFactory: (v: OrderViews) => new GetOrder(v),
      inject: [OrderViews],
    },
    {
      provide: GetOrderEvents,
      useFactory: (s: OrderEventStore) => new GetOrderEvents(s),
      inject: [OrderEventStore],
    },
    {
      provide: RebuildOrder,
      useFactory: (s: OrderEventStore, v: OrderViews) => new RebuildOrder(s, v),
      inject: [OrderEventStore, OrderViews],
    },
    {
      provide: RelayOutbox,
      useFactory: (o: Outbox, p: EventPublisher) => new RelayOutbox(o, p),
      inject: [Outbox, EventPublisher],
    },
    { provide: APP_FILTER, useClass: OrderErrorFilter },
    OrderWorkers,
  ],
})
export class OrderModule {}

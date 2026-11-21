import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { MongooseModule, getConnectionToken } from '@nestjs/mongoose';
import type { Connection } from 'mongoose';
import { randomUUID } from 'node:crypto';
import { HealthController } from './health.controller.js';
import { CreatePayment, GetPayment } from './application/payments.js';
import {
  PaymentRepository,
  OrderReader,
  PaymentProcessor,
} from './domain/payment.js';
import {
  MongoPayments,
  HttpOrders,
  SimulatedProcessor,
} from './infrastructure/adapters.js';
import { PaymentController } from './infrastructure/payment.controller.js';
import { ErrorFilter } from './infrastructure/error.filter.js';
@Module({
  imports: [
    MongooseModule.forRootAsync({
      useFactory: () => {
        if (!process.env.MONGODB_URI)
          throw new Error('MONGODB_URI obligatoria');
        return { uri: process.env.MONGODB_URI, serverSelectionTimeoutMS: 5000 };
      },
    }),
  ],
  controllers: [HealthController, PaymentController],
  providers: [
    { provide: APP_FILTER, useClass: ErrorFilter },
    {
      provide: PaymentRepository,
      useFactory: async (c: Connection) => {
        const r = new MongoPayments(c);
        await r.init();
        return r;
      },
      inject: [getConnectionToken()],
    },
    {
      provide: OrderReader,
      useFactory: () =>
        new HttpOrders(
          process.env.ORDERS_SERVICE_URL ?? 'http://127.0.0.1:3003',
        ),
    },
    {
      provide: PaymentProcessor,
      useFactory: () =>
        new SimulatedProcessor(
          process.env.SIMULATED_PAYMENT_OUTCOME === 'declined'
            ? 'declined'
            : 'approved',
        ),
    },
    {
      provide: CreatePayment,
      useFactory: (r: PaymentRepository, o: OrderReader, p: PaymentProcessor) =>
        new CreatePayment(r, o, p, randomUUID, () => new Date().toISOString()),
      inject: [PaymentRepository, OrderReader, PaymentProcessor],
    },
    {
      provide: GetPayment,
      useFactory: (r: PaymentRepository) => new GetPayment(r),
      inject: [PaymentRepository],
    },
  ],
})
export class AppModule {}

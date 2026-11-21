import { AggregateOrder } from './application/aggregate-order.js';
import { Module } from '@nestjs/common';
import { ServiceClient } from './domain/service-client.js';
import { ForwardRequest } from './application/forward-request.js';
import { HttpServiceClient } from './infrastructure/http-service-client.js';
import { GatewayController } from './infrastructure/gateway.controller.js';
@Module({
  controllers: [GatewayController],
  providers: [
    {
      provide: AggregateOrder,
      useFactory: (c: ServiceClient) => new AggregateOrder(c),
      inject: [ServiceClient],
    },
    {
      provide: ServiceClient,
      useFactory: () =>
        new HttpServiceClient({
          payments: process.env.PAYMENTS_SERVICE_URL ?? 'http://127.0.0.1:3004',
          search: process.env.SEARCH_SERVICE_URL ?? 'http://127.0.0.1:3005',
          recommendations:
            process.env.RECOMMENDATIONS_SERVICE_URL ?? 'http://127.0.0.1:3006',
          orders: process.env.ORDERS_SERVICE_URL ?? 'http://127.0.0.1:3003',
          users: process.env.USERS_SERVICE_URL ?? 'http://127.0.0.1:3001',
          catalog: process.env.CATALOG_SERVICE_URL ?? 'http://127.0.0.1:3002',
        }),
    },
    {
      provide: ForwardRequest,
      useFactory: (client: ServiceClient) => new ForwardRequest(client),
      inject: [ServiceClient],
    },
  ],
})
export class AppModule {}

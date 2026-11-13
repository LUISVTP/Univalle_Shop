import { Module } from "@nestjs/common";
import { ServiceClient } from "./domain/service-client.js";
import { ForwardRequest } from "./application/forward-request.js";
import { HttpServiceClient } from "./infrastructure/http-service-client.js";
import { GatewayController } from "./infrastructure/gateway.controller.js";
@Module({
  controllers: [GatewayController],
  providers: [
    {
      provide: ServiceClient,
      useFactory: () =>
        new HttpServiceClient({
          users: process.env.USERS_SERVICE_URL ?? "http://127.0.0.1:3001",
          catalog: process.env.CATALOG_SERVICE_URL ?? "http://127.0.0.1:3002",
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

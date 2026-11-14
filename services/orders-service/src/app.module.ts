import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OrderModule } from './order/order.module.js';
import { HealthController } from './health.controller.js';
@Module({
  imports: [
    MongooseModule.forRootAsync({
      useFactory: () => {
        if (!process.env.MONGODB_URI)
          throw new Error('MONGODB_URI is not defined');
        return { uri: process.env.MONGODB_URI, serverSelectionTimeoutMS: 5000 };
      },
    }),
    OrderModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}

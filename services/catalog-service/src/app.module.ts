import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ActivityModule } from './activity/infrastructure/activity.module.js';
import { ProductModule } from './product/product.module.js';
import { HealthController } from './health.controller.js';
@Module({
  imports: [
    MongooseModule.forRootAsync({
      useFactory: () => {
        const uri = process.env.MONGODB_URI;
        if (!uri) throw new Error('MONGODB_URI is not defined');
        return { uri, serverSelectionTimeoutMS: 5000 };
      },
    }),
    ProductModule,
    ActivityModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}

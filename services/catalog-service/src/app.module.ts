import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { ProductModule } from "./product/product.module.js";
import { HealthController } from "./health.controller.js";
@Module({
  imports: [
    MongooseModule.forRootAsync({
      useFactory: () => {
        const uri = process.env.MONGODB_URI;
        if (!uri) throw new Error("MONGODB_URI is not defined");
        return { uri, serverSelectionTimeoutMS: 5000 };
      },
    }),
    ProductModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}

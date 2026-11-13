import { Module } from "@nestjs/common";
import { APP_FILTER } from "@nestjs/core";
import { MongooseModule } from "@nestjs/mongoose";
import { ProductRepository } from "./domain/product.js";
import { CreateProduct, ListProducts } from "./application/catalog.js";
import {
  ProductDocument,
  ProductSchema,
  ProductMongoAdapter,
} from "./infrastructure/product-mongo.adapter.js";
import {
  ProductController,
  ProductErrorFilter,
} from "./infrastructure/product.controller.js";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ProductDocument.name, schema: ProductSchema },
    ]),
  ],
  controllers: [ProductController],
  providers: [
    { provide: APP_FILTER, useClass: ProductErrorFilter },
    { provide: ProductRepository, useClass: ProductMongoAdapter },
    {
      provide: CreateProduct,
      useFactory: (repo: ProductRepository) => new CreateProduct(repo),
      inject: [ProductRepository],
    },
    {
      provide: ListProducts,
      useFactory: (repo: ProductRepository) => new ListProducts(repo),
      inject: [ProductRepository],
    },
  ],
})
export class ProductModule {}

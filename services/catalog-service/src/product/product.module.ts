import { ProductReader } from './domain/product.js';
import { GetProduct } from './application/get-product.js';
import { ProductQueryController } from './infrastructure/product-query.controller.js';
import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { MongooseModule } from '@nestjs/mongoose';
import { ProductRepository } from './domain/product.js';
import { CreateProduct, ListProducts } from './application/catalog.js';
import {
  ProductDocument,
  ProductSchema,
  ProductMongoAdapter,
} from './infrastructure/product-mongo.adapter.js';
import {
  ProductController,
  ProductErrorFilter,
} from './infrastructure/product.controller.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ProductDocument.name, schema: ProductSchema },
    ]),
  ],
  controllers: [ProductController, ProductQueryController],
  providers: [
    { provide: ProductReader, useExisting: ProductRepository },
    {
      provide: GetProduct,
      useFactory: (r: ProductReader) => new GetProduct(r),
      inject: [ProductReader],
    },
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

import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { MongooseModule, getConnectionToken } from '@nestjs/mongoose';
import type { Connection } from 'mongoose';
import { CatalogReader } from './domain/product.js';
import { HttpCatalog } from './infrastructure/http-catalog.js';
import { HealthController } from './health.controller.js';
import { ErrorFilter } from './infrastructure/error.filter.js';
import { SearchProducts } from './application/search.js';
import { SearchIndex } from './domain/search-index.js';
import { MongoSearchIndex } from './infrastructure/mongo-index.js';
import { SearchController } from './infrastructure/search.controller.js';
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
  controllers: [HealthController, SearchController],
  providers: [
    { provide: APP_FILTER, useClass: ErrorFilter },
    {
      provide: CatalogReader,
      useFactory: () =>
        new HttpCatalog(
          process.env.CATALOG_SERVICE_URL ?? 'http://127.0.0.1:3002',
        ),
    },
    {
      provide: SearchIndex,
      useFactory: async (c: Connection) => {
        const r = new MongoSearchIndex(c);
        await r.init();
        return r;
      },
      inject: [getConnectionToken()],
    },
    {
      provide: SearchProducts,
      useFactory: (c: CatalogReader, i: SearchIndex) =>
        new SearchProducts(c, i, Date.now),
      inject: [CatalogReader, SearchIndex],
    },
  ],
})
export class AppModule {}

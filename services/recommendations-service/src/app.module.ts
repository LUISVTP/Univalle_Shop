import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { MongooseModule, getConnectionToken } from '@nestjs/mongoose';
import type { Connection } from 'mongoose';
import { CatalogReader } from './domain/product.js';
import { HttpCatalog } from './infrastructure/http-catalog.js';
import { HealthController } from './health.controller.js';
import { ErrorFilter } from './infrastructure/error.filter.js';
import {
  RecommendProducts,
  SavePreferences,
} from './application/recommendations.js';
import { PreferenceRepository, UserReader } from './domain/preferences.js';
import { MongoPreferences, HttpUsers } from './infrastructure/adapters.js';
import { RecommendationsController } from './infrastructure/recommendations.controller.js';
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
  controllers: [HealthController, RecommendationsController],
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
      provide: PreferenceRepository,
      useFactory: async (c: Connection) => {
        const r = new MongoPreferences(c);
        await r.init();
        return r;
      },
      inject: [getConnectionToken()],
    },
    {
      provide: UserReader,
      useFactory: () =>
        new HttpUsers(process.env.USERS_SERVICE_URL ?? 'http://127.0.0.1:3001'),
    },
    {
      provide: SavePreferences,
      useFactory: (r: PreferenceRepository, u: UserReader) =>
        new SavePreferences(r, u),
      inject: [PreferenceRepository, UserReader],
    },
    {
      provide: RecommendProducts,
      useFactory: (r: PreferenceRepository, c: CatalogReader, u: UserReader) =>
        new RecommendProducts(r, c, u),
      inject: [PreferenceRepository, CatalogReader, UserReader],
    },
  ],
})
export class AppModule {}

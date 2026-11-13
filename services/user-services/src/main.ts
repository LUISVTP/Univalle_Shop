import { NestFactory } from '@nestjs/core';
import { AppModule, ObserveInstrument } from './app.module.js';

async function bootstrap() {
  const options =
    process.env.OBSERVE_APP_KEY && process.env.OBSERVE_APP_SECRET
      ? { instrument: ObserveInstrument }
      : {};
  const app = await NestFactory.create(AppModule, options);
  app.enableShutdownHooks();
  await app.listen(process.env.PORT ?? 3001, '0.0.0.0');
}
await bootstrap();

import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.useBodyParser('json', { limit: '10mb' });
  app.useBodyParser('urlencoded', { limit: '10mb', extended: true });
  app.enableCors();
  // Bind to all interfaces so a physical device on the LAN can reach the API.
  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
}
await bootstrap();

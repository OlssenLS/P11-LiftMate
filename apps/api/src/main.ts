import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  // Bind to all interfaces so a physical device on the LAN can reach the API.
  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
}
await bootstrap();

import helmet from 'helmet';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module.js';
import { GlobalExceptionFilter } from './common/global-exception.filter.js';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Security headers via Helmet (XSS, clickjacking, MIME-sniffing protection)
  app.use(helmet());

  // Global exception filter to sanitize errors and prevent internal schema leaks
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Body parser size limits
  app.useBodyParser('json', { limit: '10mb' });
  app.useBodyParser('urlencoded', { limit: '10mb', extended: true });

  // CORS configuration
  const corsEnv = process.env.CORS_ORIGIN;
  const isProduction = process.env.NODE_ENV === 'production';

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (native mobile apps, curl, server-to-server)
      if (!origin) {
        return callback(null, true);
      }
      if (!isProduction) {
        return callback(null, true);
      }
      if (corsEnv) {
        const allowedOrigins = corsEnv.split(',').map((o) => o.trim());
        if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
          return callback(null, true);
        }
      }
      return callback(new Error('Blocked by CORS policy'), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'User-Agent'],
  });

  // Bind to all interfaces so a physical device on the LAN can reach the API.
  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
}
await bootstrap();

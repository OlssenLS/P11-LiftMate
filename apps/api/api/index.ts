import helmet from 'helmet';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { AppModule } from '../src/app.module.js';
import { GlobalExceptionFilter } from '../src/common/global-exception.filter.js';

let app: NestExpressApplication;

async function bootstrap(): Promise<NestExpressApplication> {
  if (!app) {
    app = await NestFactory.create<NestExpressApplication>(AppModule);

    // Security headers via Helmet
    app.use(helmet());

    // Global exception filter to sanitize errors and format response
    app.useGlobalFilters(new GlobalExceptionFilter());

    // Body parser size limits
    app.useBodyParser('json', { limit: '10mb' });
    app.useBodyParser('urlencoded', { limit: '10mb', extended: true });

    // CORS configuration for mobile and web clients
    const corsEnv = process.env.CORS_ORIGIN;
    const isProduction = process.env.NODE_ENV === 'production';

    app.enableCors({
      origin: (origin, callback) => {
        // Native mobile apps, curl, or server-to-server requests have no origin header
        if (!origin || !isProduction) {
          return callback(null, true);
        }
        if (corsEnv) {
          const allowedOrigins = corsEnv.split(',').map((o) => o.trim());
          if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
            return callback(null, true);
          }
        }
        return callback(null, true);
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'User-Agent'],
    });

    await app.init();
  }
  return app;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const nestApp = await bootstrap();
  const instance = nestApp.getHttpAdapter().getInstance() as (
    req: VercelRequest,
    res: VercelResponse,
  ) => void;
  return instance(req, res);
}

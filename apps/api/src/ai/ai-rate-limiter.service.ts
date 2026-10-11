import {
  Injectable,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class AiRateLimiterService {
  private readonly dailyLimit: number = 50;

  constructor(private readonly prisma: PrismaService) {}

  async checkAndIncrement(userId: string): Promise<{ remaining: number }> {
    const startOfDay = new Date();
    startOfDay.setUTCHours(0, 0, 0, 0);

    const count = await this.prisma.aiMessage.count({
      where: {
        role: 'user',
        conversation: {
          userId,
        },
        createdAt: {
          gte: startOfDay,
        },
      },
    });

    if (count >= this.dailyLimit) {
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: `Daily AI quota reached (${this.dailyLimit} requests per day). Quota resets at 00:00 UTC.`,
          error: 'Too Many Requests',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return {
      remaining: this.dailyLimit - (count + 1),
    };
  }
}

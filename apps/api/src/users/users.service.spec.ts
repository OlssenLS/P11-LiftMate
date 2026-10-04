import { Test, type TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service.js';
import { UsersService, toPublicUser } from './users.service.js';

describe('UsersService', () => {
  let service: UsersService;
  const prisma = {
    user: {
      create: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [UsersService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('hashes the password when creating a user', async () => {
    prisma.user.create.mockImplementation(({ data }: { data: Record<string, unknown> }) =>
      Promise.resolve({ id: 'u1', ...data }),
    );
    const user = await service.create('a@b.com', 'password123', 'Alice');
    const call = prisma.user.create.mock.calls[0][0] as { data: { passwordHash: string } };
    expect(call.data.passwordHash).not.toEqual('password123');
    expect(await service.verifyPassword('password123', call.data.passwordHash)).toBe(true);
    expect(user.id).toBe('u1');
  });

  it('maps a user to a public user without password or deletedAt', () => {
    const now = new Date();
    const pub = toPublicUser({
      id: 'u1',
      email: 'a@b.com',
      passwordHash: 'secret',
      displayName: 'Alice',
      dateOfBirth: null,
      weightUnit: 'kg',
      timezone: 'UTC',
      onboardedAt: null,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    } as never);
    expect(pub).not.toHaveProperty('passwordHash');
    expect(pub).not.toHaveProperty('deletedAt');
    expect(pub.email).toBe('a@b.com');
  });
});

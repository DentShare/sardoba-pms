import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  let controller: HealthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: DataSource,
          useValue: { query: jest.fn().mockResolvedValue([{ now: new Date() }]) },
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue(undefined) },
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return health status', () => {
    const result = controller.getHealth();
    expect(result.status).toBe('ok');
    expect(result.timestamp).toBeDefined();
    expect(result.version).toBeDefined();
  });

  it('should return detailed health with db and redis status', async () => {
    const result = await controller.getDetailedHealth();
    expect(result.status).toBeDefined();
    expect(result.database).toBeDefined();
    expect(result.database.status).toBe('up');
  });
});

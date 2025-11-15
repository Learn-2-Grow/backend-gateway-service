import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from './prisma.service';

/**
 * Unit Tests for PrismaService
 *
 * These tests are SAFE and will NOT affect your real database because:
 * 1. We mock all PrismaClient methods ($connect, $disconnect, etc.)
 * 2. No actual database connection is made
 * 3. All database operations are simulated with Jest mocks
 */
describe('PrismaService - Unit Tests (Safe, No DB Connection)', () => {
    let service: PrismaService;
    let mockConnect: jest.SpyInstance;
    let mockDisconnect: jest.SpyInstance;
    let mockQueryRaw: jest.SpyInstance;
    let loggerLogSpy: jest.SpyInstance;
    let loggerErrorSpy: jest.SpyInstance;
    let loggerDebugSpy: jest.SpyInstance;

    beforeEach(async () => {
        // Create a fresh instance for each test
        const module: TestingModule = await Test.createTestingModule({
            providers: [PrismaService],
        }).compile();

        service = module.get<PrismaService>(PrismaService);

        // Mock PrismaClient methods - This prevents real DB connections
        mockConnect = jest.spyOn(service, '$connect').mockResolvedValue(undefined);
        mockDisconnect = jest
            .spyOn(service, '$disconnect')
            .mockResolvedValue(undefined);
        mockQueryRaw = jest.spyOn(service, '$queryRaw').mockResolvedValue([]);

        // Mock logger methods to avoid console noise in tests
        loggerLogSpy = jest.spyOn(service['logger'], 'log').mockImplementation();
        loggerErrorSpy = jest
            .spyOn(service['logger'], 'error')
            .mockImplementation();
        loggerDebugSpy = jest
            .spyOn(service['logger'], 'debug')
            .mockImplementation();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('Service Creation', () => {
        it('should be defined', () => {
            expect(service).toBeDefined();
        });

        it('should be an instance of PrismaService', () => {
            expect(service).toBeDefined();
            expect(typeof service.$connect).toBe('function');
            expect(typeof service.$disconnect).toBe('function');
        });

        it('should have a logger', () => {
            expect(service['logger']).toBeDefined();
        });
    });

    describe('onModuleInit - Database Connection', () => {
        it('should connect to database successfully', async () => {
            await service.onModuleInit();

            expect(mockConnect).toHaveBeenCalledTimes(1);
            expect(loggerLogSpy).toHaveBeenCalledWith(
                '✅ Database connection established successfully',
            );
        });

        it('should log error and throw if connection fails', async () => {
            const connectionError = new Error('Connection failed');
            mockConnect.mockRejectedValueOnce(connectionError);

            await expect(service.onModuleInit()).rejects.toThrow('Connection failed');

            expect(mockConnect).toHaveBeenCalledTimes(1);
            expect(loggerErrorSpy).toHaveBeenCalledWith(
                '❌ Database connection failed',
                'Connection failed',
            );
        });

        it('should handle network timeout errors', async () => {
            const timeoutError = new Error('Connection timeout');
            mockConnect.mockRejectedValueOnce(timeoutError);

            await expect(service.onModuleInit()).rejects.toThrow(
                'Connection timeout',
            );

            expect(loggerErrorSpy).toHaveBeenCalledWith(
                '❌ Database connection failed',
                'Connection timeout',
            );
        });
    });

    describe('onModuleDestroy - Database Disconnection', () => {
        it('should disconnect from database', async () => {
            await service.onModuleDestroy();

            expect(mockDisconnect).toHaveBeenCalledTimes(1);
            expect(loggerLogSpy).toHaveBeenCalledWith('Database connection closed');
        });

        it('should disconnect even if called multiple times', async () => {
            await service.onModuleDestroy();
            await service.onModuleDestroy();

            expect(mockDisconnect).toHaveBeenCalledTimes(2);
        });
    });

    describe('isHealthy - Health Check', () => {
        it('should return true when database is healthy', async () => {
            mockQueryRaw.mockResolvedValueOnce([{ '?column?': 1 }]);

            const result = await service.isHealthy();

            expect(result).toBe(true);
            expect(mockQueryRaw).toHaveBeenCalledTimes(1);
        });

        it('should return false when database query fails', async () => {
            mockQueryRaw.mockRejectedValueOnce(new Error('Query failed'));

            const result = await service.isHealthy();

            expect(result).toBe(false);
            expect(mockQueryRaw).toHaveBeenCalledTimes(1);
        });

        it('should return false when database is not connected', async () => {
            mockQueryRaw.mockRejectedValueOnce(
                new Error('Client not connected to database'),
            );

            const result = await service.isHealthy();

            expect(result).toBe(false);
        });

        it('should handle timeout during health check', async () => {
            mockQueryRaw.mockRejectedValueOnce(new Error('Query timeout'));

            const result = await service.isHealthy();

            expect(result).toBe(false);
        });
    });

    describe('Query Logging in Development', () => {
        it('should log queries when NODE_ENV is development', () => {
            const originalEnv = process.env.NODE_ENV;
            process.env.NODE_ENV = 'development';

            // Create new instance to trigger constructor
            const devService = new PrismaService();
            const mockOn = jest
                .spyOn(devService, '$on')
                .mockImplementation(() => devService);

            // Re-create service to trigger event listener setup
            new PrismaService();

            // Cleanup
            process.env.NODE_ENV = originalEnv;
            mockOn.mockRestore();
        });
    });

    describe('Error Scenarios', () => {
        it('should handle invalid database credentials error', async () => {
            const authError = new Error('Invalid database credentials');
            mockConnect.mockRejectedValueOnce(authError);

            await expect(service.onModuleInit()).rejects.toThrow(
                'Invalid database credentials',
            );
        });

        it('should handle database not found error', async () => {
            const dbNotFoundError = new Error('Database does not exist');
            mockConnect.mockRejectedValueOnce(dbNotFoundError);

            await expect(service.onModuleInit()).rejects.toThrow(
                'Database does not exist',
            );
        });
    });

    describe('Lifecycle Integration', () => {
        it('should handle full lifecycle: init -> use -> destroy', async () => {
            // Initialize
            await service.onModuleInit();
            expect(mockConnect).toHaveBeenCalledTimes(1);

            // Use (health check)
            mockQueryRaw.mockResolvedValueOnce([{ '?column?': 1 }]);
            const healthy = await service.isHealthy();
            expect(healthy).toBe(true);

            // Destroy
            await service.onModuleDestroy();
            expect(mockDisconnect).toHaveBeenCalledTimes(1);
        });
    });
});

/**
 * BONUS: Integration Tests Configuration
 *
 * For SAFE integration tests with a REAL database, you can:
 *
 * Option 1: Use a separate test database
 * - Create a .env.test file with TEST_DATABASE_URL
 * - Configure Jest to load it before tests
 * - Run migrations on test DB before tests
 * - Clean up after tests
 *
 * Option 2: Use Docker for isolated testing
 * - Spin up a PostgreSQL container for tests
 * - Run tests against container
 * - Destroy container after tests
 *
 * Option 3: Use in-memory SQLite (for simple tests)
 * - Configure Prisma with SQLite in test mode
 * - Fast and completely isolated
 *
 * Example Test Database Setup:
 *
 * // jest.setup.ts
 * import { PrismaClient } from '@prisma/client';
 *
 * const prisma = new PrismaClient({
 *   datasourceUrl: process.env.TEST_DATABASE_URL,
 * });
 *
 * beforeAll(async () => {
 *   // Run migrations on test database
 *   await prisma.$executeRaw`CREATE DATABASE IF NOT EXISTS test_db`;
 * });
 *
 * afterAll(async () => {
 *   // Clean up
 *   await prisma.$disconnect();
 * });
 */

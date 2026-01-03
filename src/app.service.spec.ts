import { AppService } from './app.service';

describe('AppService', () => {
  let service: AppService;
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    service = new AppService();
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe('constructor', () => {
    it('should initialize the service with startTime', () => {
      const beforeTime = Date.now();
      const newService = new AppService();
      const afterTime = Date.now();

      // Access private property through type assertion for testing
      const startTime = (newService as unknown as { startTime: number })
        .startTime;
      expect(startTime).toBeGreaterThanOrEqual(beforeTime);
      expect(startTime).toBeLessThanOrEqual(afterTime);
    });
  });

  describe('root', () => {
    it('should return the correct root message', async () => {
      const result = await service.root();
      expect(result).toEqual({
        message: 'Backend Gateway Service is running..!',
      });
    });

    it('should return an object with message property', async () => {
      const result = await service.root();
      expect(result).toHaveProperty('message');
      expect(typeof result.message).toBe('string');
    });
  });

  describe('health', () => {
    it('should return a complete health check object', async () => {
      const result = await service.health();

      expect(result).toHaveProperty('status', 'ok');
      expect(result).toHaveProperty(
        'message',
        'Service is healthy and running....!',
      );
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('service');
      expect(result).toHaveProperty('uptime');
      expect(result).toHaveProperty('system');
      expect(result).toHaveProperty('memory');
    });

    it('should have valid service information', async () => {
      const result = await service.health();

      expect(result.service).toHaveProperty('name', 'backend-gateway-service');
      expect(result.service).toHaveProperty('version');
      expect(result.service).toHaveProperty('environment');
      expect(typeof result.service.version).toBe('string');
      expect(typeof result.service.environment).toBe('string');
    });

    it('should have valid uptime information', async () => {
      const result = await service.health();

      expect(result.uptime).toHaveProperty('milliseconds');
      expect(result.uptime).toHaveProperty('seconds');
      expect(result.uptime).toHaveProperty('formatted');
      expect(typeof result.uptime.milliseconds).toBe('number');
      expect(typeof result.uptime.seconds).toBe('number');
      expect(typeof result.uptime.formatted).toBe('string');
      expect(result.uptime.milliseconds).toBeGreaterThanOrEqual(0);
    });

    it('should have valid system information', async () => {
      const result = await service.health();

      expect(result.system).toHaveProperty('nodeVersion');
      expect(result.system).toHaveProperty('platform');
      expect(result.system).toHaveProperty('architecture');
      expect(result.system).toHaveProperty('pid');
      expect(typeof result.system.nodeVersion).toBe('string');
      expect(typeof result.system.platform).toBe('string');
      expect(typeof result.system.architecture).toBe('string');
      expect(typeof result.system.pid).toBe('number');
    });

    it('should have valid memory information', async () => {
      const result = await service.health();

      expect(result.memory).toHaveProperty('heapUsed');
      expect(result.memory).toHaveProperty('heapTotal');
      expect(result.memory).toHaveProperty('rss');
      expect(result.memory).toHaveProperty('external');
      expect(result.memory.heapUsed).toMatch(/^\d+ MB$/);
      expect(result.memory.heapTotal).toMatch(/^\d+ MB$/);
      expect(result.memory.rss).toMatch(/^\d+ MB$/);
      expect(result.memory.external).toMatch(/^\d+ MB$/);
    });

    it('should have a valid ISO timestamp', async () => {
      const result = await service.health();
      const timestamp = new Date(result.timestamp);

      expect(timestamp).toBeInstanceOf(Date);
      expect(timestamp.getTime()).not.toBeNaN();
    });

    it('should log health information to console', async () => {
      await service.health();

      expect(consoleSpy).toHaveBeenCalledTimes(1);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.objectContaining({ health: expect.any(Object) }),
      );
    });

    it('should calculate uptime correctly', async () => {
      // Wait a bit to ensure some uptime has passed
      await new Promise((resolve) => setTimeout(resolve, 100));
      const result = await service.health();

      expect(result.uptime.milliseconds).toBeGreaterThan(0);
      expect(result.uptime.seconds).toBeGreaterThanOrEqual(0);
      expect(result.uptime.formatted).toBeTruthy();
    });
  });

  describe('formatUptime (through health)', () => {
    it('should format uptime in seconds when less than a minute', async () => {
      const result = await service.health();
      // For a newly created service (less than 60 seconds)
      if (result.uptime.seconds < 60) {
        expect(result.uptime.formatted).toMatch(/^\d+s$/);
      }
    });

    it('should format uptime with days when uptime is more than 24 hours', () => {
      // Test the private formatUptime method by creating scenarios
      const dayInMs = 24 * 60 * 60 * 1000;
      const testUptime = dayInMs * 2 + 3 * 60 * 60 * 1000 + 15 * 60 * 1000; // 2 days, 3 hours, 15 minutes

      // Access private method for testing
      const formatted = (
        service as unknown as { formatUptime: (ms: number) => string }
      ).formatUptime(testUptime);
      expect(formatted).toMatch(/^\d+d \d+h \d+m$/);
      expect(formatted).toBe('2d 3h 15m');
    });

    it('should format uptime with hours when uptime is more than 1 hour but less than 24 hours', () => {
      const hourInMs = 60 * 60 * 1000;
      const testUptime = hourInMs * 5 + 30 * 60 * 1000 + 45 * 1000; // 5 hours, 30 minutes, 45 seconds

      const formatted = (
        service as unknown as { formatUptime: (ms: number) => string }
      ).formatUptime(testUptime);
      expect(formatted).toMatch(/^\d+h \d+m \d+s$/);
      expect(formatted).toBe('5h 30m 45s');
    });

    it('should format uptime with minutes when uptime is more than 1 minute but less than 1 hour', () => {
      const minuteInMs = 60 * 1000;
      const testUptime = minuteInMs * 15 + 30 * 1000; // 15 minutes, 30 seconds

      const formatted = (
        service as unknown as { formatUptime: (ms: number) => string }
      ).formatUptime(testUptime);
      expect(formatted).toMatch(/^\d+m \d+s$/);
      expect(formatted).toBe('15m 30s');
    });

    it('should format uptime with seconds when uptime is less than 1 minute', () => {
      const testUptime = 45 * 1000; // 45 seconds

      const formatted = (
        service as unknown as { formatUptime: (ms: number) => string }
      ).formatUptime(testUptime);
      expect(formatted).toMatch(/^\d+s$/);
      expect(formatted).toBe('45s');
    });

    it('should handle edge case of exactly 0 seconds', () => {
      const formatted = (
        service as unknown as { formatUptime: (ms: number) => string }
      ).formatUptime(0);
      expect(formatted).toBe('0s');
    });

    it('should handle edge case of exactly 1 day', () => {
      const dayInMs = 24 * 60 * 60 * 1000;
      const formatted = (
        service as unknown as { formatUptime: (ms: number) => string }
      ).formatUptime(dayInMs);
      expect(formatted).toBe('1d 0h 0m');
    });

    it('should handle edge case of exactly 1 hour', () => {
      const hourInMs = 60 * 60 * 1000;
      const formatted = (
        service as unknown as { formatUptime: (ms: number) => string }
      ).formatUptime(hourInMs);
      expect(formatted).toBe('1h 0m 0s');
    });

    it('should handle edge case of exactly 1 minute', () => {
      const minuteInMs = 60 * 1000;
      const formatted = (
        service as unknown as { formatUptime: (ms: number) => string }
      ).formatUptime(minuteInMs);
      expect(formatted).toBe('1m 0s');
    });
  });
});

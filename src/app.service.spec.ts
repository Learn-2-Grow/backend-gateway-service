import { AppService } from './app.service';

describe('AppService', () => {
    let service: AppService;

    beforeEach(() => {
        service = new AppService();
    });

    describe('health', () => {
        it('should return the correct health message', async () => {
            const result = await service.health();
            expect(result).toEqual({ message: 'Server is running....!!!' });
        });

        it('should contain the message property', async () => {
            const result = await service.health();
            expect(result).toHaveProperty('message');
            expect(typeof result.message).toBe('string');
        });
    });
});

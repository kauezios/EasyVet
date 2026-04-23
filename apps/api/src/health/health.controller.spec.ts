import { HealthController } from './health.controller';

describe('HealthController', () => {
  it('should return api health payload', () => {
    const controller = new HealthController();

    expect(controller.health()).toEqual({
      status: 'ok',
      service: 'easyvet-api',
    });
  });
});

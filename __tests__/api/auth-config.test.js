import handler from '@/pages/api/auth-config';
import { createMocks } from 'node-mocks-http';

describe('/api/auth-config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment variables before each test
    jest.resetModules();
    process.env = { ...originalEnv };
    // Remove the Cognito env vars set by jest.env.setup.js
    delete process.env.COGNITO_CLIENT_ID;
    delete process.env.COGNITO_DOMAIN;  
    delete process.env.AWS_REGION;
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  it('should return cognito configuration when environment variables are set', async () => {
    // Set test environment variables
    process.env.COGNITO_CLIENT_ID = 'test-client-id';
    process.env.COGNITO_DOMAIN = 'test-domain';
    process.env.AWS_REGION = 'us-west-2';

    const { req, res } = createMocks({
      method: 'GET',
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    expect(data).toEqual({
      clientId: 'test-client-id',
      domain: 'test-domain',
      region: 'us-west-2'
    });
  });

  it('should return 500 when COGNITO_CLIENT_ID is missing', async () => {
    process.env.COGNITO_DOMAIN = 'test-domain';
    process.env.AWS_REGION = 'us-west-2';
    // COGNITO_CLIENT_ID is intentionally missing

    const { req, res } = createMocks({
      method: 'GET',
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(500);
    const data = JSON.parse(res._getData());
    expect(data.error).toContain('COGNITO_CLIENT_ID environment variable is required');
  });

  it('should return 500 when COGNITO_DOMAIN is missing', async () => {
    process.env.COGNITO_CLIENT_ID = 'test-client-id';
    process.env.AWS_REGION = 'us-west-2';
    // COGNITO_DOMAIN is intentionally missing

    const { req, res } = createMocks({
      method: 'GET',
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(500);
    const data = JSON.parse(res._getData());
    expect(data.error).toContain('COGNITO_DOMAIN environment variable is required');
  });

  it('should return 500 when AWS_REGION is missing', async () => {
    process.env.COGNITO_CLIENT_ID = 'test-client-id';
    process.env.COGNITO_DOMAIN = 'test-domain';
    // AWS_REGION is intentionally missing

    const { req, res } = createMocks({
      method: 'GET',
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(500);
    const data = JSON.parse(res._getData());
    expect(data.error).toContain('AWS_REGION environment variable is required');
  });

  it('should return 405 for non-GET methods', async () => {
    const { req, res } = createMocks({
      method: 'POST',
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(405);
    const data = JSON.parse(res._getData());
    expect(data.error).toBe('Method not allowed');
  });

  it('should set appropriate cache headers', async () => {
    process.env.COGNITO_CLIENT_ID = 'test-client-id';
    process.env.COGNITO_DOMAIN = 'test-domain';
    process.env.AWS_REGION = 'us-west-2';

    const { req, res } = createMocks({
      method: 'GET',
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect(res.getHeader('Cache-Control')).toBe('public, max-age=300');
  });
});
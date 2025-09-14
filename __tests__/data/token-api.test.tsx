import {createMocks} from 'node-mocks-http'
import type {NextApiRequest, NextApiResponse} from 'next'

jest.mock('../../src/lib/dns-cache-fix', () => {
	const mockRobustFetch = jest.fn()
	return {
		createRobustFetch: jest.fn().mockReturnValue(mockRobustFetch),
		__mockRobustFetch: mockRobustFetch
	}
})

import handler from '../../src/pages/api/token'

// eslint-disable-next-line @typescript-eslint/no-var-requires
const dnsCacheFixMock = require('../../src/lib/dns-cache-fix')
const mockRobustFetch = dnsCacheFixMock.__mockRobustFetch as jest.Mock

describe('/api/token (Cognito)', () => {
	beforeEach(() => {
		mockRobustFetch.mockClear()
		// Set required environment variables for all tests
		process.env.COGNITO_DOMAIN = 'test-domain'
		process.env.AWS_REGION = 'us-west-2'
		process.env.COGNITO_CLIENT_ID = 'test-client-id'
	})

	it('should return 405 for non-POST requests', async () => {
		const {req, res} = createMocks<NextApiRequest, NextApiResponse>({method: 'GET'})
		await handler(req, res)

		expect(res._getStatusCode()).toBe(405)
		expect(JSON.parse(res._getData())).toEqual({
			error: 'Method not allowed'
		})
	})

	it('should return 400 when required params are missing', async () => {
		const {req, res} = createMocks<NextApiRequest, NextApiResponse>({
			method: 'POST',
			body: {}
		})
		await handler(req, res)

		expect(res._getStatusCode()).toBe(400)
		expect(JSON.parse(res._getData())).toEqual({
			error: 'Missing required parameters'
		})
	})

	it('should exchange code for tokens successfully', async () => {
		const fakeTokens = {
			access_token: 'access123',
			id_token: 'id123',
			refresh_token: 'refresh123',
			expires_in: 3600,
			token_type: 'Bearer'
		}

		mockRobustFetch.mockResolvedValueOnce({
			ok: true,
			json: async () => fakeTokens
		})

		const {req, res} = createMocks<NextApiRequest, NextApiResponse>({
			method: 'POST',
			body: {code: 'authcode', redirect_uri: 'http://localhost/callback'}
		})

		await handler(req, res)

		expect(res._getStatusCode()).toBe(200)
		expect(JSON.parse(res._getData())).toMatchObject(fakeTokens)

		expect(mockRobustFetch).toHaveBeenCalledWith(
			expect.stringContaining('.amazoncognito.com/oauth2/token'),
			expect.objectContaining({
				method: 'POST',
				headers: expect.any(Object),
				body: expect.stringContaining('code=authcode')
			})
		)
	})

	it('should return error when Cognito responds with failure', async () => {
		mockRobustFetch.mockResolvedValueOnce({
			ok: false,
			status: 400,
			json: async () => ({error: 'invalid_grant', error_description: 'Bad code'})
		})

		const {req, res} = createMocks<NextApiRequest, NextApiResponse>({
			method: 'POST',
			body: {code: 'badcode', redirect_uri: 'http://localhost/callback'}
		})

		await handler(req, res)

		expect(res._getStatusCode()).toBe(400)
		expect(JSON.parse(res._getData())).toEqual({
			error: 'invalid_grant',
			message: 'Bad code'
		})
	})

	it('should handle network timeout errors gracefully', async () => {
		const timeoutError = new Error('Timeout') as NodeJS.ErrnoException
		timeoutError.code = 'UND_ERR_CONNECT_TIMEOUT'

		mockRobustFetch.mockRejectedValueOnce(timeoutError)

		const {req, res} = createMocks<NextApiRequest, NextApiResponse>({
			method: 'POST',
			body: {code: 'authcode', redirect_uri: 'http://localhost/callback'}
		})

		await handler(req, res)

		const statusCode = res._getStatusCode()
		const responseData = JSON.parse(res._getData())

		expect(statusCode).toBeGreaterThanOrEqual(400)
		expect(responseData).toHaveProperty('error')
	})

	it('should handle generic internal errors', async () => {
		mockRobustFetch.mockRejectedValueOnce(new Error('Boom'))

		const {req, res} = createMocks<NextApiRequest, NextApiResponse>({
			method: 'POST',
			body: {code: 'authcode', redirect_uri: 'http://localhost/callback'}
		})

		await handler(req, res)

		expect(res._getStatusCode()).toBe(500)
		expect(JSON.parse(res._getData())).toEqual({
			error: 'Internal server error',
			message: 'Boom'
		})
	})
})

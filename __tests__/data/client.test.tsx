const originalError = console.error
const originalLog = console.log

jest.spyOn(console, 'error').mockImplementation((firstArg, secondArg, ...rest) => {
	const suppressPatterns = ['Error fetch data:', 'Error update user:', 'Error delete item:', 'Failed to fetch organizations:', 'Test error message', 'string error', 'null']

	const first = typeof firstArg === 'string' ? firstArg : firstArg?.message
	const second = typeof secondArg === 'string' ? secondArg : secondArg?.message

	const isSuppressed = suppressPatterns.some((pattern) => (first && first.includes(pattern)) || (second && second.includes(pattern)))

	if (!isSuppressed) {
		originalError(firstArg, secondArg, ...rest)
	}
})

jest.spyOn(console, 'log').mockImplementation((...args) => {
	const suppressPatterns = ['🧹 Cleared scheduled token refresh', 'Token exchange request:', 'at log (src/api/client.ts', '🌐 API Response:']

	const message = args.map((arg) => (typeof arg === 'string' ? arg : String(arg))).join(' ')

	const shouldSuppress = suppressPatterns.some((pattern) => message.includes(pattern))

	if (!shouldSuppress) {
		originalLog(...args)
	}
})

// =============================
// Now imports
// =============================
import '@testing-library/jest-dom'
import {apiClient, handleApiError} from '@/api/client'
import {store} from '@/store'
import {logout} from '@/store/thunks/authThunk'

// Mock the store and thunks
jest.mock('@/store', () => ({
	store: {
		getState: jest.fn(),
		dispatch: jest.fn()
	}
}))

jest.mock('@/store/thunks/authThunk', () => ({
	logout: jest.fn()
}))

// =============================
// Mock global fetch and Response
// =============================
const mockFetch: jest.Mock = jest.fn()
;(global as unknown as {fetch: typeof mockFetch}).fetch = mockFetch

class MockResponse {
	ok = true
	status = 200
	body?: any
	constructor(body?: any, init?: ResponseInit) {
		this.body = body
		Object.assign(this, init)
	}
	json = async () => this.body
}
;(global as unknown as {Response: typeof Response}).Response = MockResponse as any

// =============================
// Mock window.location
// =============================
Object.defineProperty(window, 'location', {
	value: {
		href: 'http://localhost:3000',
		hostname: 'localhost',
		port: '3000',
		protocol: 'http:',
		pathname: '/',
		search: '',
		hash: '',
		origin: 'http://localhost:3000',
		reload: jest.fn(),
		assign: jest.fn(),
		replace: jest.fn()
	},
	writable: true
})

Object.defineProperty(window, 'matchMedia', {
	writable: true,
	value: jest.fn().mockImplementation((query: string) => ({
		matches: false,
		media: query,
		onchange: null,
		addListener: jest.fn(), // deprecated
		removeListener: jest.fn(), // deprecated
		addEventListener: jest.fn(),
		removeEventListener: jest.fn(),
		dispatchEvent: jest.fn()
	}))
})

describe('API Client', () => {
	const mockStore = store as jest.Mocked<typeof store>
	const mockLogout = logout as jest.MockedFunction<typeof logout>

	beforeEach(() => {
		jest.clearAllMocks()
		global.fetch = jest.fn() as jest.Mock

		mockStore.getState.mockReturnValue({
			auth: {idToken: 'test-token-123'}
		} as any)

		mockLogout.mockReturnValue({type: 'auth/logout'} as any)

		mockStore.dispatch.mockImplementation(
			() =>
				({
					unwrap: jest.fn().mockResolvedValue(undefined)
				}) as any
		)
	})

	describe('getFromNextJS', () => {
		it('should make GET request with auth headers', async () => {
			const mockResponse = {data: 'test'}
			;(global.fetch as jest.Mock).mockResolvedValue({
				ok: true,
				status: 200,
				url: '/api/test',
				headers: {get: jest.fn().mockReturnValue('application/json')},
				json: jest.fn().mockResolvedValue(mockResponse)
			})

			const result = await apiClient.getFromNextJS('/api/test')

			expect(global.fetch).toHaveBeenCalledWith('/api/test', {
				method: 'GET',
				headers: {
					'Content-Type': 'application/json',
					Authorization: 'Bearer test-token-123'
				}
			})
			expect(result).toEqual(mockResponse)
		})

		it('should throw error on 404', async () => {
			;(global.fetch as jest.Mock).mockResolvedValue({
				ok: false,
				status: 404,
				json: jest.fn().mockResolvedValue({error: 'Not found'})
			})

			await expect(apiClient.getFromNextJS('/api/test')).rejects.toThrow('Not found')
		})
	})

	describe('handleApiError', () => {
		it('should handle Error instance', () => {
			const error = new Error('Test error message')
			const result = handleApiError(error, 'fetch data')
			expect(result).toEqual({error: 'Failed to fetch data', details: 'Test error message'})
		})

		it('should handle unknown error', () => {
			const result = handleApiError('string error', 'update user')
			expect(result).toEqual({error: 'Failed to update user', details: 'Unknown error occurred'})
		})

		it('should handle null error', () => {
			const result = handleApiError(null, 'delete item')
			expect(result).toEqual({error: 'Failed to delete item', details: 'Unknown error occurred'})
		})
	})
})

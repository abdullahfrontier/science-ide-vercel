import '@testing-library/jest-dom'

// =============================
// Mock global fetch safely
// =============================
const mockFetch: jest.Mock = jest.fn()
;(global as unknown as {fetch: typeof mockFetch}).fetch = mockFetch

// Mock Response constructor safely
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

// =============================
// Preserve original console
// =============================
const originalError = console.error
const originalWarn = console.warn
const originalLog = console.log

beforeAll(() => {
	jest.spyOn(console, 'error').mockImplementation((firstArg, secondArg, ...rest) => {
		const suppressPatterns = ['Error fetch data:', 'Error update user:', 'Error delete item:', 'Failed to fetch organizations:', 'Token exchange error:', '❌ Proactive token refresh failed', '❌ [/api/token] Token exchange failed:', 'Test error message', 'string error', 'null']
		// const suppressPatterns = ['Error fetch data:', 'Error update user:', 'Error delete item:', 'Failed to fetch organizations:', 'Test error message', 'string error', 'null']

		const isSuppressed = suppressPatterns.some((pattern) => {
			const first = typeof firstArg === 'string' ? firstArg : firstArg?.message
			const second = typeof secondArg === 'string' ? secondArg : secondArg?.message
			return (first && first.includes(pattern)) || (second && second.includes(pattern))
		})

		if (!isSuppressed) {
			originalError(firstArg, secondArg, ...rest)
		}
	})

	jest.spyOn(console, 'error').mockImplementation((...args) => {
		// Convert all arguments to strings for easier pattern matching
		const message = args
			.map((arg) => {
				if (typeof arg === 'string') return arg
				if (arg instanceof Error) return arg.message
				if (arg === null) return 'null'
				if (arg === undefined) return 'undefined'
				return String(arg)
			})
			.join(' ')

		// List of error patterns to suppress in tests
		const suppressPatterns = ['Error fetch data:', 'Error update user:', 'Error delete item:', 'Failed to fetch organizations:', 'Token exchange error:', '❌ Proactive token refresh failed', '❌ [/api/token] Token exchange failed:', 'Test error message', 'string error', 'null']

		// Check if any suppression pattern matches
		const shouldSuppress = suppressPatterns.some((pattern) => message.includes(pattern))

		// Only log if it's not a suppressed error
		if (!shouldSuppress) {
			originalError(...args)
		}
	})

	// Also suppress console.log for specific patterns
	jest.spyOn(console, 'log').mockImplementation((...args) => {
		const message = args
			.map((arg) => {
				if (typeof arg === 'string') return arg
				return String(arg)
			})
			.join(' ')

		const suppressLogPatterns = ['🧹 Cleared scheduled token refresh', 'Token exchange request:', 'at log (src/api/client.ts', '🌐 API Response:']

		const shouldSuppress = suppressLogPatterns.some((pattern) => message.includes(pattern))

		if (!shouldSuppress) {
			originalLog(...args)
		}
	})
})

afterEach(() => {
	jest.clearAllMocks()
})

afterAll(() => {
	console.error = originalError
	console.warn = originalWarn
	console.log = originalLog
})

// =============================
// Mock matchMedia
// =============================
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

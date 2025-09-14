// src/__mocks__/server.js
// Mock server for testing - simplified version that doesn't interfere with Jest

// Simple mock server object that Jest can import without errors
const server = {
	listen: jest.fn(),
	close: jest.fn(),
	use: jest.fn(),
	resetHandlers: jest.fn(),
	restoreHandlers: jest.fn()
}

export {server}

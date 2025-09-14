import type {Config} from 'jest'
import nextJest from 'next/jest'

const createJestConfig = nextJest({
	dir: './'
})

const customJestConfig: Config = {
	slowTestThreshold: 20,
	setupFiles: ['<rootDir>/jest.env.setup.js'],
	setupFilesAfterEnv: ['<rootDir>/jest.setup.tsx'],
	testEnvironment: 'jsdom',
	testPathIgnorePatterns: ['<rootDir>/.next/', '<rootDir>/node_modules/'],
	moduleNameMapper: {
		'^@/(.*)$': '<rootDir>/src/$1'
	},
	transform: {
		'^.+\\.(js|jsx|ts|tsx)$': 'babel-jest'
	},
	modulePathIgnorePatterns: ['<rootDir>/.next/'],
	collectCoverageFrom: ['src/**/*.{js,jsx,ts,tsx}', 'scripts/**/*.{js,jsx,ts,tsx}', '!src/**/*.d.ts', '!src/pages/_app.tsx', '!src/pages/_document.tsx'],
	coverageReporters: ['text', 'lcov', 'html'],
	coverageDirectory: 'coverage',
	testMatch: ['<rootDir>/**/__tests__/**/*.{js,jsx,ts,tsx}', '<rootDir>/**/*.{test,spec}.{js,jsx,ts,tsx}']
}

export default createJestConfig(customJestConfig)

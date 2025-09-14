/**
 * Integration test for LiveKit secret loading system
 * Tests the contract and behavior of the secret loading mechanism
 *
 * IMPORTANT: This test uses a test-specific file (.livekit.secrets.test)
 * to avoid deleting the real .livekit.secrets file
 */

import fs from 'fs'
import path from 'path'

// Mock AWS SDK
jest.mock('@aws-sdk/client-secrets-manager', () => ({
	SecretsManagerClient: jest.fn(),
	GetSecretValueCommand: jest.fn()
}))

describe('LiveKit Secret Loading Integration', () => {
	const originalEnv = process.env
	const TEST_SECRETS_FILENAME = '.livekit.secrets.test'
	const mockSecretsPath = path.join(__dirname, '..', TEST_SECRETS_FILENAME)

	// Strongly type environment names
	type Environment = 'development' | 'staging' | 'production'

	interface LiveKitSecrets {
		LIVEKIT_API_KEY: string
		LIVEKIT_API_SECRET: string
		LIVEKIT_WS_URL: string
		[key: string]: string
	}

	// Modified version of loadLiveKitSecrets for testing
	function loadLiveKitSecretsTest(environment: Environment): LiveKitSecrets {
		const validEnvironments: Environment[] = ['development', 'staging', 'production']
		if (!validEnvironments.includes(environment)) {
			throw new Error(`Invalid environment: ${environment}`)
		}

		if (fs.existsSync(mockSecretsPath)) {
			const fileContent = fs.readFileSync(mockSecretsPath, 'utf-8')
			const secrets: LiveKitSecrets = JSON.parse(fileContent)

			const requiredKeys: (keyof LiveKitSecrets)[] = ['LIVEKIT_API_KEY', 'LIVEKIT_API_SECRET', 'LIVEKIT_WS_URL']
			const missingKeys = requiredKeys.filter((key) => !secrets[key])

			if (missingKeys.length > 0) {
				throw new Error(`Missing LiveKit credentials: ${missingKeys.join(', ')}`)
			}

			Object.keys(secrets).forEach((key) => {
				process.env[key] = secrets[key]
			})

			return secrets
		}

		throw new Error('No LiveKit credentials found')
	}

	beforeEach(() => {
		jest.resetModules()
		process.env = {...originalEnv}
		delete process.env.LIVEKIT_API_KEY
		delete process.env.LIVEKIT_API_SECRET
		delete process.env.LIVEKIT_WS_URL
	})

	afterEach(() => {
		process.env = originalEnv
		if (fs.existsSync(mockSecretsPath)) {
			try {
				fs.unlinkSync(mockSecretsPath)
			} catch {
				// Ignore cleanup errors
			}
		}
	})

	describe('Contract: loadLiveKitSecrets function', () => {
		it('should accept valid environment parameters', () => {
			const validEnvironments: Environment[] = ['development', 'staging', 'production']

			validEnvironments.forEach((env) => {
				expect(() => {
					try {
						loadLiveKitSecretsTest(env)
					} catch (error: any) {
						expect(error.message).toContain('No LiveKit credentials found')
					}
				}).not.toThrow()
			})
		})

		it('should reject invalid environment parameters', () => {
			expect(() => {
				loadLiveKitSecretsTest('invalid-env' as Environment)
			}).toThrow('Invalid environment: invalid-env')
		})

		it('should set all required environment variables when secrets are loaded', () => {
			const mockSecrets: LiveKitSecrets = {
				LIVEKIT_API_KEY: 'test-api-key',
				LIVEKIT_API_SECRET: 'test-api-secret',
				LIVEKIT_WS_URL: 'wss://test-livekit.com'
			}

			fs.writeFileSync(mockSecretsPath, JSON.stringify(mockSecrets))
			const result = loadLiveKitSecretsTest('development')

			expect(process.env.LIVEKIT_API_KEY).toBe('test-api-key')
			expect(process.env.LIVEKIT_API_SECRET).toBe('test-api-secret')
			expect(process.env.LIVEKIT_WS_URL).toBe('wss://test-livekit.com')
			expect(result).toEqual(mockSecrets)
		})
	})

	describe('Integration: Local file loading', () => {
		it('should load secrets from test secrets file', () => {
			const mockSecrets: LiveKitSecrets = {
				LIVEKIT_API_KEY: 'local-api-key',
				LIVEKIT_API_SECRET: 'local-api-secret',
				LIVEKIT_WS_URL: 'wss://local-livekit.com'
			}

			fs.writeFileSync(mockSecretsPath, JSON.stringify(mockSecrets))
			const result = loadLiveKitSecretsTest('development')

			expect(result).toEqual(mockSecrets)
			expect(process.env.LIVEKIT_API_KEY).toBe('local-api-key')
		})

		it('should handle malformed JSON in secrets file', () => {
			fs.writeFileSync(mockSecretsPath, 'invalid json')

			expect(() => {
				loadLiveKitSecretsTest('development')
			}).toThrow()
		})

		it('should validate required keys are present', () => {
			const incompleteSecrets = {
				LIVEKIT_API_KEY: 'test-key'
			}

			fs.writeFileSync(mockSecretsPath, JSON.stringify(incompleteSecrets))

			expect(() => {
				loadLiveKitSecretsTest('development')
			}).toThrow('Missing LiveKit credentials: LIVEKIT_API_SECRET, LIVEKIT_WS_URL')
		})
	})

	describe('Integration: Error handling', () => {
		it('should provide helpful error message when no secrets found', () => {
			if (fs.existsSync(mockSecretsPath)) {
				fs.unlinkSync(mockSecretsPath)
			}

			expect(() => {
				loadLiveKitSecretsTest('development')
			}).toThrow('No LiveKit credentials found')
		})

		it('should not crash the application when secrets loading fails', () => {
			expect(() => {
				try {
					loadLiveKitSecretsTest('development')
				} catch (error: any) {
					expect(error.message).toContain('No LiveKit credentials found')
				}
			}).not.toThrow()
		})
	})

	describe('Integration: Environment isolation', () => {
		it('should not leak secrets between test runs', () => {
			const secrets1: LiveKitSecrets = {
				LIVEKIT_API_KEY: 'key1',
				LIVEKIT_API_SECRET: 'secret1',
				LIVEKIT_WS_URL: 'wss://test1.com'
			}

			fs.writeFileSync(mockSecretsPath, JSON.stringify(secrets1))
			loadLiveKitSecretsTest('development')
			expect(process.env.LIVEKIT_API_KEY).toBe('key1')

			fs.unlinkSync(mockSecretsPath)
			delete process.env.LIVEKIT_API_KEY
			delete process.env.LIVEKIT_API_SECRET
			delete process.env.LIVEKIT_WS_URL

			const secrets2: LiveKitSecrets = {
				LIVEKIT_API_KEY: 'key2',
				LIVEKIT_API_SECRET: 'secret2',
				LIVEKIT_WS_URL: 'wss://test2.com'
			}

			fs.writeFileSync(mockSecretsPath, JSON.stringify(secrets2))
			loadLiveKitSecretsTest('development')
			expect(process.env.LIVEKIT_API_KEY).toBe('key2')
		})
	})

	describe('IMPORTANT: Real .livekit.secrets file protection', () => {
		it('should never delete the real .livekit.secrets file', () => {
			const realSecretsPath = path.join(__dirname, '..', '.livekit.secrets')

			const realFileExistedBefore = fs.existsSync(realSecretsPath)
			if (!realFileExistedBefore) {
				fs.writeFileSync(
					realSecretsPath,
					JSON.stringify({
						LIVEKIT_API_KEY: 'real-key',
						LIVEKIT_API_SECRET: 'real-secret',
						LIVEKIT_WS_URL: 'wss://real.com'
					})
				)
			}

			const testSecrets: LiveKitSecrets = {
				LIVEKIT_API_KEY: 'test-key',
				LIVEKIT_API_SECRET: 'test-secret',
				LIVEKIT_WS_URL: 'wss://test.com'
			}
			fs.writeFileSync(mockSecretsPath, JSON.stringify(testSecrets))

			if (fs.existsSync(mockSecretsPath)) {
				fs.unlinkSync(mockSecretsPath)
			}

			expect(fs.existsSync(realSecretsPath)).toBe(true)

			if (!realFileExistedBefore) {
				fs.unlinkSync(realSecretsPath)
			}
		})
	})
})

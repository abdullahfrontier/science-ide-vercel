import {store} from '@/store'
import {logout} from '@/store/thunks/authThunk'
import {updateTokens} from '@/store/slices/authSlice'
import {scheduleTokenRefresh, clearTokenRefresh} from '../../src/lib/refresh-token'
import type {AuthState} from '@/store/slices/authSlice'
import type {PersistPartial} from 'redux-persist/es/persistReducer'

const createMockAuthState = (overrides?: Partial<AuthState>): AuthState => ({
	user: null,
	idToken: null,
	refreshToken: null,
	isAuthenticated: false,
	loading: false,
	error: null,
	currentOrganization: null,
	orginizations: [],
	currentExperimentId: null,
	latitude: null,
	longitude: null,
	...overrides
})

const mockGetState = (authState: AuthState = createMockAuthState()) => ({
	auth: authState,
	_persist: {version: -1, rehydrated: true} as PersistPartial['_persist']
})

const mockAuthState = createMockAuthState({
	idToken: 'mock-id-token-12345',
	refreshToken: 'mock-refresh-token-67890'
})

const mockAuthStateNoTokens = createMockAuthState({
	idToken: null,
	refreshToken: null
})

jest.mock('@/store', () => ({
	store: {
		getState: jest.fn(),
		dispatch: jest.fn()
	}
}))

jest.mock('@/store/thunks/authThunk')
jest.mock('@/store/slices/authSlice')
jest.mock('../../src/lib/cognito-auth')

jest.useFakeTimers()

const mockStore = store as jest.Mocked<typeof store>
const mockLogout = logout as jest.MockedFunction<typeof logout>
const mockUpdateTokens = updateTokens as jest.MockedFunction<typeof updateTokens>

describe('tokenRefresh', () => {
	const mockCognitoAuth = {
		refreshToken: jest.fn()
	}

	beforeEach(() => {
		jest.clearAllMocks()
		jest.clearAllTimers()

		jest.spyOn(global, 'setTimeout')
		jest.spyOn(global, 'clearTimeout')

		mockStore.getState.mockReturnValue(mockGetState())
		mockStore.dispatch.mockReturnValue({} as any)
		mockUpdateTokens.mockReturnValue({} as any)
		mockLogout.mockReturnValue({type: 'LOGOUT'} as any)

		jest.doMock('../../src/lib/cognito-auth', () => ({
			cognitoAuth: mockCognitoAuth
		}))

		clearTokenRefresh()
	})

	afterEach(() => {
		jest.clearAllTimers()
		clearTokenRefresh()
	})

	describe('scheduleTokenRefresh', () => {
		it('should schedule token refresh when ID token is available', () => {
			const consoleSpy = jest.spyOn(console, 'log').mockImplementation()
			mockStore.getState.mockReturnValue(mockGetState(mockAuthState)) // ✅ Ensure tokens

			scheduleTokenRefresh()

			expect(setTimeout).toHaveBeenCalledTimes(1)
			expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), 12 * 60 * 1000)
			expect(consoleSpy).toHaveBeenCalledWith('⏰ Next token refresh scheduled in 12 minutes')

			consoleSpy.mockRestore()
		})

		it('should not schedule refresh when no ID token is available', () => {
			const consoleSpy = jest.spyOn(console, 'warn').mockImplementation()
			mockStore.getState.mockReturnValue(mockGetState(mockAuthStateNoTokens))

			scheduleTokenRefresh()

			expect(setTimeout).not.toHaveBeenCalled()
			expect(consoleSpy).toHaveBeenCalledWith('⚠️ No ID token available; skipping refresh scheduling')

			consoleSpy.mockRestore()
		})

		it('should clear existing timer before scheduling new one', () => {
			const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout')
			mockStore.getState.mockReturnValue(mockGetState(mockAuthState))

			scheduleTokenRefresh()
			expect(setTimeout).toHaveBeenCalledTimes(1)

			scheduleTokenRefresh()
			expect(clearTimeoutSpy).toHaveBeenCalledTimes(1)
			expect(setTimeout).toHaveBeenCalledTimes(2)

			clearTimeoutSpy.mockRestore()
		})

		it('should trigger refresh when timeout expires', async () => {
			const consoleSpy = jest.spyOn(console, 'log').mockImplementation()
			mockStore.getState.mockReturnValue(mockGetState(mockAuthState))
			mockCognitoAuth.refreshToken.mockResolvedValue({id_token: 'new-token'})

			scheduleTokenRefresh()
			await jest.advanceTimersByTimeAsync(12 * 60 * 1000)

			expect(consoleSpy).toHaveBeenCalledWith('⏰ Proactive token refresh triggered')
			expect(mockCognitoAuth.refreshToken).toHaveBeenCalledWith('mock-refresh-token-67890')

			consoleSpy.mockRestore()
		})
	})

	describe('clearTokenRefresh', () => {
		it('should clear scheduled refresh timer', () => {
			const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout')
			const consoleSpy = jest.spyOn(console, 'log').mockImplementation()
			mockStore.getState.mockReturnValue(mockGetState(mockAuthState))

			scheduleTokenRefresh()
			clearTokenRefresh()

			expect(clearTimeoutSpy).toHaveBeenCalledTimes(1)
			expect(consoleSpy).toHaveBeenCalledWith('🧹 Cleared scheduled token refresh')

			clearTimeoutSpy.mockRestore()
			consoleSpy.mockRestore()
		})

		it('should handle clearing when no timer is set', () => {
			const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout')

			clearTokenRefresh()
			expect(clearTimeoutSpy).not.toHaveBeenCalled()

			clearTimeoutSpy.mockRestore()
		})
	})

	describe('refreshAccessToken (via scheduled refresh)', () => {
		it('should successfully refresh token', async () => {
			const consoleSpy = jest.spyOn(console, 'log').mockImplementation()
			mockStore.getState.mockReturnValue(mockGetState(mockAuthState))
			mockCognitoAuth.refreshToken.mockResolvedValue({id_token: 'new-id-token'})

			scheduleTokenRefresh()
			await jest.advanceTimersByTimeAsync(12 * 60 * 1000)

			expect(mockCognitoAuth.refreshToken).toHaveBeenCalledWith('mock-refresh-token-67890')
			expect(mockStore.dispatch).toHaveBeenCalledWith(updateTokens('new-id-token'))
			expect(consoleSpy).toHaveBeenCalledWith('✅ Proactive token refresh succeeded')

			consoleSpy.mockRestore()
		})

		it('should logout when refresh token missing', async () => {
			const consoleSpy = jest.spyOn(console, 'log').mockImplementation()
			mockStore.getState.mockReturnValue(mockGetState(createMockAuthState({idToken: 'mock', refreshToken: null})))

			scheduleTokenRefresh()
			await jest.advanceTimersByTimeAsync(12 * 60 * 1000)

			expect(consoleSpy).toHaveBeenCalledWith('❌ No refresh token available; cannot refresh')

			consoleSpy.mockRestore()
		})

		it('should logout when Cognito refresh fails', async () => {
			const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
			mockStore.getState.mockReturnValue(mockGetState(mockAuthState))
			mockCognitoAuth.refreshToken.mockResolvedValue(null)

			scheduleTokenRefresh()
			await jest.advanceTimersByTimeAsync(12 * 60 * 1000)

			expect(mockStore.dispatch).toHaveBeenCalledWith(logout())
			expect(consoleSpy).toHaveBeenCalledWith('❌ Cognito refresh failed, logging out')

			consoleSpy.mockRestore()
		})

		it('should handle refresh errors', async () => {
			const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
			mockStore.getState.mockReturnValue(mockGetState(mockAuthState))
			const refreshError = new Error('Network error')
			mockCognitoAuth.refreshToken.mockRejectedValue(refreshError)

			scheduleTokenRefresh()
			await jest.advanceTimersByTimeAsync(12 * 60 * 1000)

			expect(mockStore.dispatch).toHaveBeenCalledWith(logout())
			expect(consoleSpy).toHaveBeenCalledWith('❌ Token refresh error:', refreshError)

			consoleSpy.mockRestore()
		})

		it('should prevent concurrent refresh attempts', async () => {
			const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {})
			mockStore.getState.mockReturnValue(mockGetState(mockAuthState))

			let resolveRefresh: (value: any) => void
			const refreshPromise = new Promise((resolve) => {
				resolveRefresh = resolve
			})
			mockCognitoAuth.refreshToken.mockReturnValue(refreshPromise)

			const {refreshAccessToken} = require('../../src/lib/refresh-token')

			const first = refreshAccessToken()
			const second = refreshAccessToken()

			resolveRefresh!({id_token: 'new-token'})
			await first
			await second

			expect(consoleSpy).toHaveBeenCalledWith('⏳ Already refreshing, waiting for existing refresh...')
			expect(mockCognitoAuth.refreshToken).toHaveBeenCalledTimes(1)

			consoleSpy.mockRestore()
		})
	})

	describe('Edge cases', () => {
		it('should handle dynamic import failure', async () => {
			const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
			const importError = new Error('Module not found')

			jest.resetModules()

			jest.doMock('@/store', () => ({
				store: {
					getState: jest.fn(() => ({
						auth: createMockAuthState({refreshToken: 'mock-refresh', idToken: 'mock-id'})
					})),
					dispatch: jest.fn()
				}
			}))

			jest.doMock('@/store/thunks/authThunk', () => ({
				logout: jest.fn(() => ({type: 'LOGOUT'}))
			}))

			jest.doMock('@/store/slices/authSlice', () => ({
				updateTokens: jest.fn()
			}))

			jest.doMock('../../src/lib/cognito-auth', () => {
				throw importError
			})

			const {scheduleTokenRefresh} = await import('../../src/lib/refresh-token')

			scheduleTokenRefresh()
			await jest.advanceTimersByTimeAsync(12 * 60 * 1000)

			const {store} = await import('@/store')
			const {logout} = await import('@/store/thunks/authThunk')

			expect(store.dispatch).toHaveBeenCalledWith(logout())
			expect(consoleSpy).toHaveBeenCalledWith('❌ Token refresh error:', importError)

			consoleSpy.mockRestore()
		})
	})
})

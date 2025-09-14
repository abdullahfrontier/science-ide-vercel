import React, {ReactNode} from 'react'
import {renderHook, act} from '@testing-library/react'
import {useConfig, ConfigProvider} from '../../src/hooks/useConfig'

const mockReplace = jest.fn()
const mockRouter = {replace: mockReplace}

jest.mock('next/navigation', () => ({
	useRouter: () => mockRouter
}))

jest.mock('cookies-next', () => ({
	getCookie: jest.fn(),
	setCookie: jest.fn()
}))

describe('Configuration Management Integration', () => {
	const mockGetCookie = require('cookies-next').getCookie as jest.Mock
	const mockSetCookie = require('cookies-next').setCookie as jest.Mock

	beforeEach(() => {
		jest.clearAllMocks()
		mockGetCookie.mockReturnValue(null)
		delete process.env.NEXT_PUBLIC_APP_CONFIG
	})

	const wrapper = ({children}: {children: ReactNode}) => <ConfigProvider>{children}</ConfigProvider>

	describe('Contract: Configuration Parsing', () => {
		it('should use default config when no environment config provided', () => {
			const {result} = renderHook(() => useConfig(), {wrapper})

			expect(result.current.config.title).toBe('LiveKit Agents Playground')
			expect(result.current.config.settings.editable).toBe(true)
			expect(result.current.config.settings.theme_color).toBe('cyan')
			expect(result.current.config.settings.chat).toBe(true)
			expect(result.current.config.settings.inputs.camera).toBe(true)
			expect(result.current.config.settings.inputs.mic).toBe(true)
			expect(result.current.config.settings.outputs.audio).toBe(true)
			expect(result.current.config.settings.outputs.video).toBe(true)
		})

		it('should parse valid JSON configuration from environment', () => {
			process.env.NEXT_PUBLIC_APP_CONFIG = JSON.stringify({
				title: 'JSON Config',
				settings: {
					editable: true,
					theme_color: 'purple',
					chat: true,
					inputs: {camera: true, mic: false},
					outputs: {audio: true, video: false}
				}
			})

			const {result} = renderHook(() => useConfig(), {wrapper})

			expect(result.current.config.title).toBe('JSON Config')
			expect(result.current.config.settings.theme_color).toBe('purple')
			expect(result.current.config.settings.inputs.mic).toBe(false)
			expect(result.current.config.settings.outputs.video).toBe(false)
		})

		it('should handle malformed configuration gracefully', () => {
			process.env.NEXT_PUBLIC_APP_CONFIG = 'invalid: yaml: content: ['

			const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

			const {result} = renderHook(() => useConfig(), {wrapper})

			expect(result.current.config.title).toBe('LiveKit Agents Playground')
			expect(result.current.config.settings.editable).toBe(true)
			expect(consoleSpy).toHaveBeenCalledWith('Error parsing app config:', expect.any(Error))

			consoleSpy.mockRestore()
		})

		it('should merge missing settings with defaults', () => {
			process.env.NEXT_PUBLIC_APP_CONFIG = JSON.stringify({
				title: 'Partial Config',
				settings: {
					theme_color: 'red',
					editable: true,
					chat: true,
					inputs: {camera: true, mic: true},
					outputs: {audio: true, video: true},
					show_experiment_pane: true,
					ws_url: '',
					token: '',
					room_name: '',
					participant_name: ''
				}
			})

			const {result} = renderHook(() => useConfig(), {wrapper})

			expect(result.current.config.title).toBe('Partial Config')
			expect(result.current.config.settings.theme_color).toBe('red')
			expect(result.current.config.settings.editable).toBe(true)
			expect(result.current.config.settings.chat).toBe(true)
			expect(result.current.config.settings.inputs.camera).toBe(true)
		})

		it('should handle configuration without settings', () => {
			process.env.NEXT_PUBLIC_APP_CONFIG = JSON.stringify({
				title: 'No Settings Config',
				description: 'Config without settings'
			})

			const {result} = renderHook(() => useConfig(), {wrapper})

			expect(result.current.config.title).toBe('No Settings Config')
			expect(result.current.config.settings.editable).toBe(true)
			expect(result.current.config.settings.theme_color).toBe('cyan')
		})
	})

	describe('Integration: Cookie Handling', () => {
		it('should load settings from cookies when config is editable', () => {
			const cookieSettings = {
				editable: true,
				theme_color: 'blue',
				chat: false,
				inputs: {camera: false, mic: true},
				outputs: {audio: true, video: false},
				show_experiment_pane: false,
				ws_url: '',
				token: '',
				room_name: '',
				participant_name: ''
			}

			mockGetCookie.mockReturnValue(JSON.stringify(cookieSettings))

			const {result} = renderHook(() => useConfig(), {wrapper})

			expect(result.current.config.settings.theme_color).toBe('blue')
			expect(result.current.config.settings.chat).toBe(false)
			expect(result.current.config.settings.inputs.camera).toBe(false)
			expect(result.current.config.settings.inputs.mic).toBe(true)
			expect(result.current.config.settings.outputs.audio).toBe(true)
			expect(result.current.config.settings.outputs.video).toBe(false)
			expect(result.current.config.settings.show_experiment_pane).toBe(false)
		})

		it('should handle malformed cookie data gracefully', () => {
			mockGetCookie.mockReturnValue('invalid-json')

			const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

			const {result} = renderHook(() => useConfig(), {wrapper})

			expect(result.current.config.settings.theme_color).toBe('cyan')
			expect(result.current.config.settings.chat).toBe(true)
			expect(consoleSpy).toHaveBeenCalledWith('Error parsing settings from cookie:', expect.any(Error))

			consoleSpy.mockRestore()
		})

		it('should ignore cookies when config is not editable', () => {
			process.env.NEXT_PUBLIC_APP_CONFIG = JSON.stringify({
				settings: {
					editable: false,
					theme_color: 'cyan',
					chat: true
				}
			})

			const cookieSettings = {
				theme_color: 'blue',
				chat: false
			}

			mockGetCookie.mockReturnValue(JSON.stringify(cookieSettings))

			const {result} = renderHook(() => useConfig(), {wrapper})

			expect(result.current.config.settings.theme_color).toBe('cyan')
			expect(result.current.config.settings.chat).toBe(true)
		})
	})

	describe('Integration: Settings Updates', () => {
		it('should update settings when config is editable', () => {
			const {result} = renderHook(() => useConfig(), {wrapper})

			const newSettings = {
				editable: true,
				theme_color: 'green',
				chat: false,
				inputs: {camera: false, mic: true},
				outputs: {audio: true, video: false},
				show_experiment_pane: false,
				ws_url: '',
				token: '',
				room_name: '',
				participant_name: ''
			}

			act(() => {
				result.current.setUserSettings(newSettings)
			})

			expect(result.current.config.settings.theme_color).toBe('green')
			expect(result.current.config.settings.chat).toBe(false)
			expect(result.current.config.settings.inputs.camera).toBe(false)
			expect(result.current.config.settings.show_experiment_pane).toBe(false)
			expect(mockSetCookie).toHaveBeenCalledWith('lk_settings', JSON.stringify(newSettings))
		})

		it('should only allow theme_color updates when not editable', () => {
			process.env.NEXT_PUBLIC_APP_CONFIG = JSON.stringify({
				settings: {
					editable: false,
					theme_color: 'cyan',
					chat: true,
					inputs: {camera: true, mic: true},
					outputs: {audio: true, video: true}
				}
			})

			const {result} = renderHook(() => useConfig(), {wrapper})

			const newSettings = {
				editable: false,
				theme_color: 'purple',
				chat: false,
				inputs: {camera: false, mic: false},
				outputs: {audio: false, video: false},
				show_experiment_pane: false,
				ws_url: '',
				token: '',
				room_name: '',
				participant_name: ''
			}

			act(() => {
				result.current.setUserSettings(newSettings)
			})

			expect(result.current.config.settings.theme_color).toBe('purple')
			expect(result.current.config.settings.chat).toBe(true)
			expect(result.current.config.settings.inputs.camera).toBe(true)
			expect(mockSetCookie).not.toHaveBeenCalled()
		})
	})

	describe('Contract: Context Error Handling', () => {
		it('should throw error when useConfig is used outside ConfigProvider', () => {
			const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

			expect(() => {
				renderHook(() => useConfig())
			}).toThrow('useConfig must be used within a ConfigProvider')

			consoleSpy.mockRestore()
		})
	})
})

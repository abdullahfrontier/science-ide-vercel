'use client'

import {getCookie, setCookie} from 'cookies-next'
import jsYaml from 'js-yaml'
import {useRouter} from 'next/navigation'
import React, {createContext, useCallback, useEffect, useMemo, useState} from 'react'

export type AppConfig = {
	title: string
	description: string
	github_link?: string
	video_fit?: 'cover' | 'contain'
	settings: UserSettings
	show_qr?: boolean
	show_experiment_pane: boolean
}

export type UserSettings = {
	editable: boolean
	theme_color: string
	chat: boolean
	inputs: {
		camera: boolean
		mic: boolean
	}
	outputs: {
		audio: boolean
		video: boolean
	}
	show_experiment_pane: boolean
	ws_url: string
	token: string
	room_name: string
	participant_name: string
}

// Fallback if NEXT_PUBLIC_APP_CONFIG is not set
const defaultConfig: AppConfig = {
	title: 'LiveKit Agents Playground',
	description: 'A virtual workbench for testing multimodal AI agents.',
	video_fit: 'cover',
	settings: {
		editable: true,
		theme_color: 'cyan',
		chat: true,
		inputs: {
			camera: true,
			mic: true
		},
		outputs: {
			audio: true,
			video: true
		},
		show_experiment_pane: true,
		ws_url: '',
		token: '',
		room_name: '',
		participant_name: ''
	},
	show_qr: false,
	show_experiment_pane: true
}

const useAppConfig = (): AppConfig => {
	return useMemo(() => {
		if (process.env.NEXT_PUBLIC_APP_CONFIG) {
			try {
				const parsedConfig = jsYaml.load(process.env.NEXT_PUBLIC_APP_CONFIG) as AppConfig
				if (parsedConfig.settings === undefined) {
					parsedConfig.settings = defaultConfig.settings
				}
				if (parsedConfig.settings.editable === undefined) {
					parsedConfig.settings.editable = true
				}
				return parsedConfig
			} catch (e) {
				console.error('Error parsing app config:', e)
			}
		}
		return defaultConfig
	}, [])
}

type ConfigData = {
	config: AppConfig
	setUserSettings: (settings: UserSettings) => void
}

const ConfigContext = createContext<ConfigData | undefined>(undefined)

export const ConfigProvider = ({children}: {children: React.ReactNode}) => {
	const initialAppConfig = useAppConfig() // Base config from env/defaults
	const router = useRouter()
	// State to hold the dynamically resolved config
	const [hydratedConfig, setHydratedConfig] = useState<AppConfig>(initialAppConfig)
	// Flag to ensure client-side hydration runs only once
	const [isClientInitialized, setIsClientInitialized] = useState(false)

	const setUrlSettings = useCallback(
		(us: UserSettings) => {
			const obj = new URLSearchParams({
				cam: boolToString(us.inputs.camera),
				mic: boolToString(us.inputs.mic),
				video: boolToString(us.outputs.video),
				audio: boolToString(us.outputs.audio),
				chat: boolToString(us.chat),
				theme_color: us.theme_color || 'cyan',
				experiment: boolToString(us.show_experiment_pane)
			})
			// Use shallow routing to prevent full page navigation
			router.replace(window.location.pathname + '#' + obj.toString())
		},
		[router]
	)

	const setCookieSettings = useCallback((us: UserSettings) => {
		const json = JSON.stringify(us)
		setCookie('lk_settings', json)
	}, [])

	const getSettingsFromUrl = useCallback((): Partial<UserSettings> | null => {
		if (typeof window === 'undefined' || !window.location.hash) return null
		// URL settings should only apply if the base config is editable
		if (!initialAppConfig.settings.editable) return null

		const params = new URLSearchParams(window.location.hash.replace('#', ''))
		const settings: Partial<UserSettings> = {}

		if (params.has('chat')) settings.chat = params.get('chat') === '1'
		if (params.has('theme_color')) settings.theme_color = params.get('theme_color')!
		if (params.has('cam') || params.has('mic')) {
			settings.inputs = {
				camera: params.get('cam') === '1',
				mic: params.get('mic') === '1'
			}
		}
		if (params.has('audio') || params.has('video')) {
			settings.outputs = {
				audio: params.get('audio') === '1',
				video: params.get('video') === '1'
			}
		}
		if (params.has('experiment')) settings.show_experiment_pane = params.get('experiment') === '1'

		if (Object.keys(settings).length > 0) {
			settings.editable = true
		}

		return Object.keys(settings).length > 0 ? settings : null
	}, [initialAppConfig.settings.editable])

	const getSettingsFromCookies = useCallback((): UserSettings | null => {
		// Cookie settings should only apply if the base config is editable
		if (!initialAppConfig.settings.editable) return null
		const jsonSettings = getCookie('lk_settings')
		if (!jsonSettings) return null
		try {
			return JSON.parse(jsonSettings) as UserSettings
		} catch (e) {
			console.error('Error parsing settings from cookie:', e)
			return null
		}
	}, [initialAppConfig.settings.editable])

	useEffect(() => {
		if (typeof window === 'undefined' || isClientInitialized) {
			return
		}

		const initializeSettings = () => {
			let finalSettings = {...initialAppConfig.settings}

			if (initialAppConfig.settings.editable) {
				const settingsFromCookies = getSettingsFromCookies()
				const settingsFromUrl = getSettingsFromUrl()

				if (settingsFromCookies) {
					finalSettings = {...finalSettings, ...settingsFromCookies}
				}

				if (settingsFromUrl) {
					// URL parameters override corresponding fields from cookies/defaults
					finalSettings = {...finalSettings, ...settingsFromUrl}
					// If URL was the source of truth for some settings, update cookies
					setCookieSettings(finalSettings)
				} else if (settingsFromCookies) {
					// No URL parameters, but cookies exist. Sync cookie settings to URL.
					setUrlSettings(settingsFromCookies)
				}
			}

			setHydratedConfig((prev) => ({...prev, settings: finalSettings}))
			setIsClientInitialized(true)
		}

		initializeSettings()
	}, [])

	const setUserSettings = useCallback(
		(newUserSettings: UserSettings) => {
			setHydratedConfig((currentConfig) => {
				if (!currentConfig.settings.editable) {
					// If not editable, only allow theme_color to be changed
					const updatedSettings = {...currentConfig.settings, theme_color: newUserSettings.theme_color}
					return {...currentConfig, settings: updatedSettings}
				} else {
					// If editable, persist to URL and cookies, then update state
					setUrlSettings(newUserSettings)
					setCookieSettings(newUserSettings)
					return {...currentConfig, settings: newUserSettings}
				}
			})
		},
		[setUrlSettings, setCookieSettings]
	)

	const contextValue = useMemo(
		() => ({
			config: hydratedConfig,
			setUserSettings
		}),
		[hydratedConfig, setUserSettings]
	)

	return <ConfigContext.Provider value={contextValue}>{children}</ConfigContext.Provider>
}

export const useConfig = () => {
	const context = React.useContext(ConfigContext)
	if (context === undefined) {
		throw new Error('useConfig must be used within a ConfigProvider')
	}
	return context
}

const boolToString = (b: boolean) => (b ? '1' : '0')

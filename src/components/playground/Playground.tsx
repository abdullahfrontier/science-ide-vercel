/* eslint-disable no-console */
'use client'

import React, {useEffect, useImperativeHandle, useRef, forwardRef, useCallback} from 'react'
import {useVoiceAssistant} from '@livekit/components-react'

import {useConfig} from '@/hooks/useConfig'
import tailwindTheme from '../../lib/tailwindTheme.preval'
import PlaygroundChat, {PlaygroundChatRef} from './PlaygroundChat'

export interface PlaygroundProps {
	// logo?: ReactNode
	// themeColors: string[]
}

export interface PlaygroundRef {
	handleRowComplete: (csvRow: string) => Promise<void>
	hasAgent: () => Promise<boolean>
	// sendExperimentChangeRPC: (newExperimentId: string) => Promise<void>
	handleChatToastMessage: (message: string) => Promise<void>
	handleShowSessionInfo: () => Promise<void>
}

const Playground = forwardRef<PlaygroundRef, PlaygroundProps>(({}, ref) => {
	const {config} = useConfig()
	const playgroundChatRef = useRef<PlaygroundChatRef>(null)

	const voiceAssistant = useVoiceAssistant()

	useEffect(() => {
		document.body.style.setProperty(
			'--lk-theme-color',
			// @ts-ignore
			tailwindTheme.colors[config.settings.theme_color]['500']
		)
		document.body.style.setProperty('--lk-drop-shadow', `var(--lk-theme-color) 0px 0px 18px`)
	}, [config.settings.theme_color])

	const handleRowComplete = useCallback(async (csvRow: string) => {
		await playgroundChatRef.current?.handleRowComplete(csvRow)
	}, [])

	// const sendExperimentChangeRPC = useCallback(async (newExperimentId: string) => {
	// 	await playgroundChatRef.current?.sendExperimentChangeRPC(newExperimentId)
	// }, [])

	const handleChatToastMessage = useCallback(async (message: string) => {
		await playgroundChatRef.current?.handleChatToastMessage(message)
	}, [])

	const hasAgent = useCallback(async () => {
		return !!voiceAssistant.agent
	}, [])

	const handleShowSessionInfo = useCallback(async () => {
		await playgroundChatRef.current?.handleShowSessionInfo()
	}, [])

	useImperativeHandle(ref, () => ({
		handleRowComplete,
		hasAgent,
		// sendExperimentChangeRPC,
		handleChatToastMessage,
		handleShowSessionInfo
	}))

	return <PlaygroundChat ref={playgroundChatRef} />
})

Playground.displayName = 'Playground'

export default Playground

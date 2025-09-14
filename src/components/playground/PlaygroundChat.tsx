/* eslint-disable no-console */
'use client'

import React, {useImperativeHandle, forwardRef, useCallback, useEffect, useMemo, useState} from 'react'
import {AnimatePresence, motion} from 'framer-motion'
import {ConnectionState, LocalParticipant, Track} from 'livekit-client'
import {QRCodeSVG} from 'qrcode.react'
import {BarVisualizer, VideoTrack, useConnectionState, useDataChannel, useLocalParticipant, useRoomInfo, useTracks, useVoiceAssistant, useRoomContext} from '@livekit/components-react'
import {Typography, Spin} from 'antd'

import {LoadingSVG} from '@/components/button/LoadingSVG'
import {ChatMessageType} from '@/components/chat/ChatTile'
import {ConfigurationPanelItem} from '@/components/config/ConfigurationPanelItem'
import {NameValueRow} from '@/components/config/NameValueRow'
import {useConfig} from '@/hooks/useConfig'
import {TranscriptionTile} from '@/components/transcriptions/TranscriptionTile'
import {EditableNameValueRow} from '@/components/config/NameValueRow'
import {PlaygroundToast} from '@/components/toast/PlaygroundToast'
import {useToast} from '@/components/toast/ToasterProvider'
import {SessionInfoModal} from './SessionInfoModal'
const {Title} = Typography

export interface PlaygroundMeta {
	name: string
	value: string
}

export interface PlaygroundChatProps {
	// logo?: ReactNode
	// themeColors: string[]
}

export interface PlaygroundChatRef {
	handleOnTakePicture: () => Promise<void>
	handleOnUploadPicture: () => Promise<void>
	handleOnToggleCamera: () => Promise<void>
	handleRowComplete: (csvRow: string) => Promise<void>
	// sendExperimentChangeRPC: (newExperimentId: string) => Promise<void>
	handleChatToastMessage: (message: string) => Promise<void>
	handleShowSessionInfo: () => Promise<void>
}

const PlaygroundChat = forwardRef<PlaygroundChatRef, PlaygroundChatProps>(({}, ref) => {
	const {config, setUserSettings} = useConfig()
	const {name} = useRoomInfo()
	const [transcripts, setTranscripts] = useState<ChatMessageType[]>([])
	const {localParticipant} = useLocalParticipant()

	const voiceAssistant = useVoiceAssistant()

	const roomState = useConnectionState()
	const tracks = useTracks()
	const room = useRoomContext()

	const {toastMessage, setToastMessage} = useToast()
	const [rpcMethod, setRpcMethod] = useState('')
	const [rpcPayload, setRpcPayload] = useState('')
	const [audioOutputEnabled, setAudioOutputEnabled] = useState(false)
	const [micInputEnabled, setMicInputEnabled] = useState(false)
	const [cameraInputEnabled, setCameraInputEnabled] = useState(false)
	const [isTogglingCamera, setIsTogglingCamera] = useState(false)
	const [isTogglingChat, setIsTogglingChat] = useState(false)
	const [chatSendFunction, setChatSendFunction] = useState<((message: string) => Promise<any>) | null>(null)
	const [addLocalMessageFunction, setAddLocalMessageFunction] = useState<((message: string) => void) | null>(null)
	const [showSessionInfo, setShowSessionInfo] = useState(false)

	useEffect(() => {
		return () => {
			if (localParticipant) {
				localParticipant.setCameraEnabled(false)
			}
		}
	}, [])

	useEffect(() => {
		if (roomState === ConnectionState.Connected) {
			setAudioOutputEnabled(false)
			setMicInputEnabled(false)
			setCameraInputEnabled(false)
			if (typeof navigator !== 'undefined' && localParticipant) {
				localParticipant.setCameraEnabled(false)
				localParticipant.setMicrophoneEnabled(false)
			}
		}
	}, [localParticipant, roomState])

	useEffect(() => {
		if (roomState === ConnectionState.Connected && voiceAssistant.audioTrack) {
			console.log('Audio track initialized:', voiceAssistant.audioTrack)
		}
	}, [roomState, voiceAssistant.audioTrack])

	useEffect(() => {
		return () => {
			if (localParticipant) {
				localParticipant.setCameraEnabled(false)
				localParticipant.setMicrophoneEnabled(false)
			}
			setAudioOutputEnabled(false)
			setMicInputEnabled(false)
			setCameraInputEnabled(false)
		}
	}, [localParticipant])

	// Stable callback: use functional update to avoid stale closures
	const onDataReceived = useCallback((msg: any) => {
		console.log('📨 Data channel message received:', {
			topic: msg.topic,
			payload: msg.payload,
			payloadSize: msg.payload?.length
		})

		// First try to decode the payload to check for embedded topic
		try {
			const decoded = JSON.parse(new TextDecoder('utf-8').decode(msg.payload))
			console.log('📦 Decoded payload:', decoded)

			// Check if topic is in the decoded payload (agent sends it this way)
			const actualTopic = decoded.topic || msg.topic

			if (actualTopic === 'transcription' || msg.topic === 'transcription') {
				console.log('📝 Transcription message:', decoded)
				const timestamp = decoded.timestamp > 0 ? decoded.timestamp : Date.now()
				const newEntry: ChatMessageType = {
					name: 'You',
					message: decoded.text,
					timestamp,
					isSelf: true
				}
				setTranscripts((prev) => [...prev, newEntry])
			} else if (actualTopic === 'image_message') {
				console.log('🖼️ Image message detected:', decoded)

				const imageMessage: ChatMessageType = {
					name: 'Assistant',
					message: '📸 Image captured',
					timestamp: decoded.timestamp || Date.now(),
					isSelf: false,
					type: 'image',
					logId: decoded.log_id,
					sessionId: decoded.session_id,
					organizationId: decoded.organization_id,
					experimentId: decoded.experiment_id
				}

				console.log('🖼️ Adding image message to transcripts:', imageMessage)
				setTranscripts((prev) => {
					const updated = [...prev, imageMessage]
					console.log('📊 Updated transcripts count:', updated.length)
					return updated
				})
			} else {
				console.log('⚠️ Unknown topic in message:', actualTopic)
			}
		} catch (e) {
			console.error('Failed to decode data channel message:', e)
		}
	}, [])

	// Register listener once
	useDataChannel(onDataReceived)

	// const agentVideoTrack = tracks.find((trackRef) => trackRef.publication.kind === Track.Kind.Video && trackRef.participant.isAgent)

	const localTracks = tracks.filter(({participant}) => participant instanceof LocalParticipant)
	const localVideoTrack = localTracks.find(({source}) => source === Track.Source.Camera)
	// const localMicTrack = localTracks.find(({source}) => source === Track.Source.Microphone)

	const handleRpcCall = useCallback(async () => {
		if (!voiceAssistant.agent || !room) return
		try {
			const response = await room.localParticipant.performRpc({
				destinationIdentity: voiceAssistant.agent.identity,
				method: rpcMethod,
				payload: rpcPayload
			})
			console.log('RPC response:', response)
		} catch (e) {
			console.error('RPC call failed:', e)
		}
	}, [room, rpcMethod, rpcPayload, voiceAssistant.agent])

	const sendRpcCommand = useCallback(
		async (method: string, payload: string) => {
			if (!voiceAssistant.agent || !room) {
				console.warn('No agent or room available for RPC call')
				return
			}
			try {
				const response = await room.localParticipant.performRpc({
					destinationIdentity: voiceAssistant.agent.identity,
					method,
					payload,
					responseTimeout: 10000
				})
				console.log(`RPC ${method} response:`, response)
			} catch (e) {
				console.error(`RPC ${method} call failed:`, e)
			}
		},
		[room, voiceAssistant.agent]
	)

	const handleOnTakePicture = useCallback(async () => {
		if (!localParticipant.isCameraEnabled) {
			alert(`Cannot access video stream. Please ensure the user's camera is enabled.`)
			return
		}
		await sendRpcCommand('capture_image', 'take_pic')
	}, [sendRpcCommand])

	const handleOnUploadPicture = useCallback(async () => {
		console.log('Upload button clicked')
		console.log('Current state:', {
			hasLocalParticipant: !!localParticipant,
			hasAgent: !!voiceAssistant.agent,
			agentIdentity: voiceAssistant.agent?.identity,
			roomState: roomState
		})

		// Create file input element
		const fileInput = document.createElement('input')
		fileInput.type = 'file'
		fileInput.accept = 'image/*'
		fileInput.style.display = 'none'

		// Handle file selection
		fileInput.onchange = async (event) => {
			console.log('File selected')
			const file = (event.target as HTMLInputElement).files?.[0]
			if (file) {
				console.log('File details:', {
					name: file.name,
					type: file.type,
					size: file.size
				})

				try {
					if (!localParticipant) {
						console.error('No local participant available for file upload')
						alert('Cannot upload: Not connected to room')
						return
					}

					// Use LiveKit sendFile function instead of RPC
					console.log('Uploading file via LiveKit sendFile:', file.name, file.type)
					const result = await localParticipant.sendFile(file, {
						mimeType: file.type,
						topic: 'images',
						destinationIdentities: voiceAssistant.agent ? [voiceAssistant.agent.identity] : undefined,
						onProgress: (progress) => {
							console.log(`Upload progress: ${Math.round(progress * 100)}%`)
						}
					})

					console.log('File upload successful:', result)
					alert('Image uploaded successfully!')

					// Add image to chat locally (not sent to agent)
					if (addLocalMessageFunction) {
						try {
							// Create an image URL from the file for preview
							const imageUrl = URL.createObjectURL(file)

							// Add image message to local chat only
							// Format: [IMAGE]url|filename|size
							const imageMetadata = `[IMAGE]${imageUrl}|${file.name}|${file.size}`
							addLocalMessageFunction(imageMetadata)

							console.log('Image added to chat locally (not sent to agent)')

							// Clean up the blob URL after a delay to ensure it's rendered
							setTimeout(() => {
								URL.revokeObjectURL(imageUrl)
							}, 60000) // Keep URL valid for 1 minute
						} catch (chatError) {
							console.error('Failed to add image to chat:', chatError)
						}
					} else {
						console.warn('Add local message function not available')
					}
				} catch (error) {
					console.error('Failed to upload image via LiveKit:', error)
					alert(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
				}
			}
			// Clean up
			document.body.removeChild(fileInput)
		}

		// Trigger file dialog
		document.body.appendChild(fileInput)
		fileInput.click()
	}, [localParticipant, voiceAssistant.agent, roomState, addLocalMessageFunction])

	const handleOnToggleCamera = useCallback(async () => {
		if (isTogglingCamera) return
		setIsTogglingCamera(true)
		try {
			setCameraInputEnabled((prev) => {
				const newState = !prev
				if (localParticipant) {
					localParticipant.setCameraEnabled(newState)
				}
				;(async () => {
					if (newState) {
						if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
							try {
								await navigator.mediaDevices.getUserMedia({video: true})
							} catch (e) {
								console.error('Failed to access camera:', e)
								setCameraInputEnabled(false)
								localParticipant?.setCameraEnabled(false)
								alert('Failed to access camera. Please check your browser permissions.')
								return
							}
						} else if (typeof navigator === 'undefined') {
							console.error('Navigator not available (SSR)')
							setCameraInputEnabled(false)
							return
						}
					}
					const payload = newState ? 'camera_on' : 'camera_off'
					await sendRpcCommand('toggle_input_video', payload)
				})()
				return newState
			})
		} finally {
			setIsTogglingCamera(false)
		}
	}, [sendRpcCommand, localParticipant, isTogglingCamera])

	const handleToggleChat = useCallback(async () => {
		if (isTogglingChat) return
		setIsTogglingChat(true)
		try {
			const newState = !(micInputEnabled && audioOutputEnabled)
			setMicInputEnabled(newState)
			setAudioOutputEnabled(newState)

			// Handle microphone permissions and setup
			if (typeof navigator !== 'undefined' && navigator.mediaDevices) {
				try {
					if (newState) {
						await navigator.mediaDevices.getUserMedia({audio: true})
					} else {
						const stream = await navigator.mediaDevices.getUserMedia({audio: true})
						stream.getAudioTracks().forEach((track) => {
							track.stop()
							console.log('Audio track stopped:', track.id)
						})
					}
				} catch (e) {
					console.error(`Failed to ${newState ? 'access' : 'stop'} microphone:`, e)
					if (newState) {
						setMicInputEnabled(false)
						setAudioOutputEnabled(false)
						if (localParticipant) {
							localParticipant.setMicrophoneEnabled(false)
						}
						alert('Failed to access microphone. Please check your browser permissions.')
						return
					}
				}
			} else if (typeof navigator === 'undefined') {
				console.error('Navigator not available (server-side rendering)')
				if (newState) {
					setMicInputEnabled(false)
					setAudioOutputEnabled(false)
					return
				}
			}

			if (localParticipant) {
				localParticipant.setMicrophoneEnabled(newState)
			}

			// Send RPC commands for both mic and audio
			const micPayload = newState ? 'mic_on' : 'mic_off'
			const audioPayload = newState ? 'audio_on' : 'audio_off'

			try {
				await Promise.all([sendRpcCommand('toggle_input_audio', micPayload), sendRpcCommand('toggle_output', audioPayload)])
				console.log(`Chat ${newState ? 'enabled' : 'disabled'}: mic=${micPayload}, audio=${audioPayload}`)
			} catch (rpcError) {
				console.error('Failed to send RPC commands:', rpcError)
			}
		} catch (error) {
			console.error('Error in handleToggleChat:', error)
			setMicInputEnabled(false)
			setAudioOutputEnabled(false)
			if (localParticipant) {
				localParticipant.setMicrophoneEnabled(false)
			}
		} finally {
			setIsTogglingChat(false)
		}
	}, [sendRpcCommand, micInputEnabled, audioOutputEnabled, localParticipant, isTogglingChat])

	const handleRowComplete = useCallback(
		async (csvRow: string) => {
			if (chatSendFunction) {
				try {
					await chatSendFunction(`Data entry completed: ${csvRow}`)
				} catch (error) {
					console.error('Failed to send CSV row to chat:', error)
				}
			}
		},
		[chatSendFunction]
	)

	const handleChatSendReady = useCallback((sendFunction: (message: string) => Promise<any>, addLocalMessage: (message: string) => void) => {
		setChatSendFunction(() => sendFunction)
		setAddLocalMessageFunction(() => addLocalMessage)
	}, [])

	const handleChatToastMessage = useCallback(async (message: string) => {
		setToastMessage({message: message, type: 'error'})
	}, [])

	const handleShowSessionInfo = useCallback(async () => {
		setShowSessionInfo(true)
	}, [])

	const renderTranscriptionTile = useMemo(() => {
		if (voiceAssistant.agent) {
			return <TranscriptionTile onTakePicture={handleOnTakePicture} onUploadPicture={handleOnUploadPicture} onToggleCamera={handleOnToggleCamera} cameraInputEnabled={cameraInputEnabled} isTogglingCamera={isTogglingCamera} agentAudioTrack={voiceAssistant.audioTrack} hasAgent={!!voiceAssistant.agent} chatEnabled={micInputEnabled && audioOutputEnabled} onToggleChat={handleToggleChat} isTogglingChat={isTogglingChat} onChatSendReady={handleChatSendReady} externalMessages={transcripts} localVideoTrack={localVideoTrack!} />
		} else {
			return <></>
		}
	}, [cameraInputEnabled, voiceAssistant.audioTrack, voiceAssistant.agent, micInputEnabled, audioOutputEnabled, handleToggleChat, isTogglingChat, handleChatSendReady, transcripts, localVideoTrack, handleOnTakePicture, handleOnUploadPicture, handleOnToggleCamera, isTogglingCamera])

	useImperativeHandle(ref, () => ({
		handleOnTakePicture,
		handleOnUploadPicture,
		handleOnToggleCamera,
		handleRowComplete,
		// sendExperimentChangeRPC,
		handleChatToastMessage,
		handleShowSessionInfo
	}))

	return (
		<>
			{config.settings.chat && (
				<>
					<AnimatePresence>
						{toastMessage && (
							<motion.div className="left-0 right-0 top-0 absolute z-10" initial={{opacity: 0, translateY: -50}} animate={{opacity: 1, translateY: 0}} exit={{opacity: 0, translateY: -50}}>
								<PlaygroundToast />
							</motion.div>
						)}
					</AnimatePresence>
					{voiceAssistant.agent ? (
						<div className="w-full min-h-0">{renderTranscriptionTile}</div>
					) : (
						<div className="h-full flex flex-col">
							<div
								className="flex-1 h-full rounded-lg bg-white shadow-sm"
								style={{
									display: 'flex',
									alignItems: 'center',
									justifyContent: 'center'
								}}>
								<div className="flex flex-col items-center justify-center p-8">
									<Spin size="large" />
									<Title level={4} className="mt-4 mb-2">
										Agent Connecting...
									</Title>
								</div>
							</div>
						</div>
					)}
					<SessionInfoModal open={showSessionInfo} cameraInputEnabled={cameraInputEnabled} onClose={() => setShowSessionInfo(false)} />
				</>
			)}
		</>
	)
})

PlaygroundChat.displayName = 'PlaygroundChat'

export default PlaygroundChat

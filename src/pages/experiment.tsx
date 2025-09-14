import React, {useCallback, useState, useEffect, useRef, useMemo} from 'react'
import {ToastProvider} from '@/components/toast/ToasterProvider'
import {useSelector} from 'react-redux'
import {RootState} from '@/store'
import {LiveKitRoom, RoomAudioRenderer} from '@livekit/components-react'

import PageHead from '@/components/common/PageHead'
import MainLayout from '@/components/layouts/MainLayout'
import {ConfigProvider, useConfig} from '@/hooks/useConfig'
import RenderTabs from '../components/playground/RenderTabs'
import {ExperimentPicker} from '@/components/experiment/ExperimentPicker'
import {PlaygroundHeader} from '@/components/playground/PlaygroundHeader'
import {PlaygroundTile} from '@/components/playground/PlaygroundTile'
import Playground, {PlaygroundRef} from '@/components/playground/Playground'
import {ConnectionProvider, useConnection} from '@/hooks/useConnection'

export default function ExperimentPage() {
	return (
		<MainLayout>
			<ToastProvider>
				<ConfigProvider>
					<ConnectionProvider>
						<ExperimentPageInner />
					</ConnectionProvider>
				</ConfigProvider>
			</ToastProvider>
		</MainLayout>
	)
}

export function ExperimentPageInner() {
	const headerHeight = 56

	const {config} = useConfig()
	const {shouldConnect, wsUrl, token, connect, disconnect} = useConnection()

	const {isAuthenticated, currentExperimentId} = useSelector((state: RootState) => state.auth)
	const [autoConnectAttempted, setAutoConnectAttempted] = useState(false)
	const [reconnectKey, setReconnectKey] = useState(0) // Add key for forcing reconnection

	const playgroundRef = useRef<PlaygroundRef>(null)
	const [experimentId, setExperimentId] = useState<string>(currentExperimentId ?? '')
	const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
	const isReconnectingRef = useRef(false)

	const handleConnect = useCallback(
		async (c: boolean) => {
			if (c) {
				await disconnect()
				await connect()
			} else {
				await disconnect()
			}
		},
		[connect, disconnect]
	)

	// Improved reconnection handler
	const handleReconnect = useCallback(async () => {
		if (isReconnectingRef.current) return

		isReconnectingRef.current = true
		console.log('🔄 Attempting to reconnect LiveKit room...')

		try {
			// Clear any existing timeout
			if (reconnectTimeoutRef.current) {
				clearTimeout(reconnectTimeoutRef.current)
			}

			// Force disconnect and reconnect
			await disconnect()

			// Small delay to ensure clean disconnection
			await new Promise((resolve) => setTimeout(resolve, 1000))

			// Force a new room instance by incrementing the key
			setReconnectKey((prev) => prev + 1)

			// Reconnect
			await connect()
		} catch (error) {
			console.error('❌ Reconnection failed:', error)

			// Retry after delay
			reconnectTimeoutRef.current = setTimeout(() => {
				isReconnectingRef.current = false
				handleReconnect()
			}, 3000)

			return
		}

		isReconnectingRef.current = false
		console.log('✅ Reconnection completed')
	}, [connect, disconnect])

	// Handle visibility change (when user comes back to tab)
	useEffect(() => {
		// const handleVisibilityChange = () => {
		// 	if (!document.hidden && shouldConnect) {
		// 		console.log('👁️ Tab became visible, checking connection...')
		// 		// Small delay to allow browser to restore network
		// 		setTimeout(() => {
		// 			handleReconnect()
		// 		}, 1000)
		// 	}
		// }

		const handleOnline = () => {
			if (shouldConnect) {
				console.log('🌐 Network came back online')
				setTimeout(() => {
					handleReconnect()
				}, 1000)
			}
		}

		const handleOffline = () => {
			console.log('📴 Network went offline')
		}

		// document.addEventListener('visibilitychange', handleVisibilityChange)
		window.addEventListener('online', handleOnline)
		window.addEventListener('offline', handleOffline)

		return () => {
			// document.removeEventListener('visibilitychange', handleVisibilityChange)
			window.removeEventListener('online', handleOnline)
			window.removeEventListener('offline', handleOffline)
		}
	}, [shouldConnect, handleReconnect])

	// Enhanced error handling
	useEffect(() => {
		const unhandledRejectionHandler = (event: PromiseRejectionEvent) => {
			const message = event.reason?.message || ''

			if (message.includes("signalingState is 'closed'") || message.includes("Failed to execute 'setRemoteDescription'") || message.includes('RTCPeerConnection')) {
				console.warn('🚨 LiveKit WebRTC error detected:', message)
				event.preventDefault()

				// Trigger reconnection for critical errors
				if (shouldConnect && !isReconnectingRef.current) {
					console.log('🔄 Triggering reconnection due to WebRTC error')
					setTimeout(() => handleReconnect(), 100)
				}
			}
		}

		const errorHandler = (event: ErrorEvent) => {
			const message = event.message || ''

			if (message.includes("signalingState is 'closed'") || message.includes("Failed to execute 'setRemoteDescription'") || message.includes('RTCPeerConnection')) {
				console.warn('🚨 LiveKit WebRTC error detected:', message)
				event.preventDefault()

				// Trigger reconnection for critical errors
				if (shouldConnect && !isReconnectingRef.current) {
					console.log('🔄 Triggering reconnection due to WebRTC error')
					setTimeout(() => handleReconnect(), 100)
				}
			}
		}

		window.addEventListener('unhandledrejection', unhandledRejectionHandler)
		window.addEventListener('error', errorHandler)

		return () => {
			window.removeEventListener('unhandledrejection', unhandledRejectionHandler)
			window.removeEventListener('error', errorHandler)
			if (reconnectTimeoutRef.current) {
				clearTimeout(reconnectTimeoutRef.current)
			}
		}
	}, [shouldConnect, handleReconnect])

	useEffect(() => {
		if (!isAuthenticated || autoConnectAttempted) {
			return
		}
		handleConnect(true)
		setAutoConnectAttempted(true)
	}, [isAuthenticated, handleConnect, autoConnectAttempted])

	const experimentPickerComponent = useMemo(
		() => (
			<ExperimentPicker
				compact={true}
				onExperimentChange={async (newExperimentId) => {
					// await playgroundRef.current?.sendExperimentChangeRPC(newExperimentId)
					setExperimentId(newExperimentId)
				}}
			/>
		),
		[]
	)

	const handleRowComplete = useCallback(async (csvRow: string) => {
		await playgroundRef.current?.handleRowComplete(csvRow)
	}, [])

	const handleChatToastMessage = useCallback(async (message: string) => {
		await playgroundRef.current?.handleChatToastMessage(message)
	}, [])

	const handleShowSessionInfo = useCallback(async () => {
		await playgroundRef.current?.handleShowSessionInfo()
	}, [])

	return (
		<>
			<PageHead />
			<div className="lg:h-[calc(100vh-2.5rem)] flex flex-col overflow-hidden">
				<div className="flex-shrink-0 px-4 pt-2 bg-background repeating-square-background" style={{height: `${headerHeight + 8}px`}}>
					<PlaygroundHeader title={config.title} height={headerHeight} experimentPicker={experimentPickerComponent} hasAgent={!!playgroundRef.current?.hasAgent} handleShowSessionInfo={handleShowSessionInfo} />
				</div>

				<main className="flex-1 flex flex-col lg:flex-row gap-4 px-4 pt-4 pb-4 lg:pb-0 bg-background repeating-square-background overflow-hidden min-h-0">
					{config.settings.chat && (
						<div className="flex flex-col w-full lg:w-1/3 min-h-0">
							<PlaygroundTile className="flex-1 min-h-0 relative overflow-hidden" padding={false}>
								<LiveKitRoom
									key={experimentId + '-' + reconnectKey} // Need both for proper resets
									className="flex flex-col h-full w-full"
									serverUrl={wsUrl}
									token={token}
									connect={shouldConnect}
									onConnected={() => {
										console.log('✅ LiveKit Room connected successfully')
										console.log('🔗 WebSocket URL:', wsUrl)
										console.log('🎫 Token:', token ? token.substring(0, 50) + '...' : 'No token')
										// Reset reconnect flag on successful connection
										isReconnectingRef.current = false

										// Decode and log token payload to verify metadata
										if (token) {
											try {
												const tokenPayload = JSON.parse(atob(token.split('.')[1]))
												console.log('🏷️ Connected with token payload:', tokenPayload)
												if (tokenPayload.metadata) {
													const metadata = JSON.parse(tokenPayload.metadata)
													console.log('📋 Room metadata:', metadata)
													console.log('🔬 Experiment ID in metadata:', metadata.experimentId)
													console.log('🏢 Organization ID in metadata:', metadata.org_id)
												}
											} catch (e) {
												console.log('⚠️ Could not parse token metadata:', e)
											}
										}
									}}
									onDisconnected={(reason) => {
										console.log('🔌 LiveKit Room disconnected:', reason)

										// Auto-reconnect only for unexpected disconnects
										// Skip reconnection if reason indicates intentional disconnect
										const shouldReconnect = shouldConnect && !isReconnectingRef.current && reason !== undefined && !String(reason).toLowerCase().includes('client')

										if (shouldReconnect) {
											console.log('🔄 Scheduling reconnection after unexpected disconnect')
											setTimeout(() => handleReconnect(), 2000)
										}
									}}
									onError={(e) => {
										const message = e.message || ''

										if (message.includes("signalingState is 'closed'") || message.includes("Failed to execute 'setRemoteDescription'") || message.includes('RTCPeerConnection')) {
											console.warn('🚨 Ignoring WebRTC closed connection error:', message)

											// Trigger reconnection for these specific errors
											if (shouldConnect && !isReconnectingRef.current) {
												console.log('🔄 Triggering reconnection due to connection error')
												setTimeout(() => handleReconnect(), 1000)
											}
											return
										}

										// Handle other errors normally
										handleChatToastMessage(e.message)
										console.error('❌ LiveKit Room error:', e)
									}}>
									<div className="flex-1 pb-[52px]">
										<Playground ref={playgroundRef} />
									</div>
									<RoomAudioRenderer />
								</LiveKitRoom>
							</PlaygroundTile>
						</div>
					)}

					<div className={`flex flex-col ${config.settings.chat ? 'w-full lg:w-2/3' : 'w-full'} min-h-0`}>
						<PlaygroundTile className="flex-1 min-h-0" padding={false}>
							<RenderTabs handleRowComplete={handleRowComplete} experimentId={experimentId} />
						</PlaygroundTile>
					</div>
				</main>
			</div>
		</>
	)
}

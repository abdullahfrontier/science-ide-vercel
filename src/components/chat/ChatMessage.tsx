import React, {useState, useEffect} from 'react'
import {Avatar, Typography, Space, Spin} from 'antd'
import {UserOutlined, RobotOutlined, FileImageOutlined} from '@ant-design/icons'

import {STYLES} from '@/lib/styles'
import {cn} from '@/lib/util'
import {useAuthHeaders} from '@/hooks/useAuthHeaders'

type ChatMessageProps = {
	message: string
	name: string
	isSelf: boolean
	hideName?: boolean
	type?: 'text' | 'image'
	logId?: string
	sessionId?: string
	organizationId?: string
	experimentId?: string
}

export const ChatMessage = ({name, message, isSelf, hideName, type = 'text', logId, sessionId, organizationId, experimentId}: ChatMessageProps) => {
	const {Text} = Typography

	const [imageError, setImageError] = useState(false)
	const [imageLoading, setImageLoading] = useState(true)
	const [imageSrc, setImageSrc] = useState<string | null>(null)

	const {getAuthHeaders} = useAuthHeaders()

	// Fetch image with authentication
	useEffect(() => {
		console.log('🎨 ChatMessage render:', {
			type,
			logId,
			message,
			name,
			isSelf
		})

		if (type === 'image' && logId && sessionId && organizationId && experimentId) {
			console.log(`🖼️ Image message detected in ChatMessage, fetching image with logId: ${logId}`)
			const fetchImage = async () => {
				try {
					// Only use session data from backend - it's the source of truth
					console.log('📋 Using backend context for image fetch:', {
						organizationId,
						experimentId,
						sessionId
					})

					const imageUrl = `/api/get-log-image?logId=${logId}&orgId=${organizationId}&experimentId=${experimentId}&sessionId=${sessionId}`
					console.log(`🔗 Fetching image from: ${imageUrl}`)

					const response = await fetch(imageUrl, {
						headers: getAuthHeaders()
					})

					console.log(`📡 Image fetch response:`, {
						status: response.status,
						ok: response.ok,
						contentType: response.headers.get('content-type')
					})

					if (!response.ok) {
						throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`)
					}

					const blob = await response.blob()
					console.log(`📦 Image blob received, size: ${blob.size} bytes, type: ${blob.type}`)

					const url = URL.createObjectURL(blob)
					console.log(`🎨 Blob URL created: ${url}`)
					setImageSrc(url)
					setImageLoading(false)
				} catch (error) {
					console.error('❌ Error fetching image:', error)
					setImageError(true)
					setImageLoading(false)
				}
			}

			fetchImage()

			// Cleanup blob URL on unmount
			return () => {
				if (imageSrc) {
					URL.revokeObjectURL(imageSrc)
				}
			}
		}
	}, [type, logId, sessionId, organizationId, experimentId])

	const renderContent = () => {
		if (type === 'image' && logId) {
			return (
				<div className="relative">
					{imageLoading && (
						<div className="flex items-center justify-center p-8 bg-gray-100 rounded-lg">
							<Spin />
						</div>
					)}

					{imageSrc && !imageLoading && (
						<img
							src={imageSrc}
							className={cn('max-w-full rounded-lg cursor-pointer', 'hover:opacity-90 transition-opacity')}
							style={{maxHeight: '400px'}}
							alt="Captured image"
							onClick={() => {
								// Only use session data from backend
								if (organizationId && experimentId && sessionId) {
									window.open(`/api/get-log-image?logId=${logId}&orgId=${organizationId}&experimentId=${experimentId}&sessionId=${sessionId}`, '_blank')
								}
							}}
						/>
					)}

					{imageError && (
						<div className="p-4 bg-red-50 rounded-lg text-center">
							<Text type="danger">Failed to load image</Text>
						</div>
					)}
				</div>
			)
		}

		return <span>{message}</span>
	}

	return (
		<div className={cn('flex gap-2 items-start w-full', isSelf ? 'flex-row-reverse' : 'flex-row', hideName ? 'mb-1' : 'mb-3')}>
			{!hideName && <Avatar size={24} icon={isSelf ? <UserOutlined /> : <RobotOutlined />} className={cn('flex-shrink-0', STYLES.avatar.small, isSelf ? STYLES.avatar.user : STYLES.avatar.assistant)} />}

			<div className="flex-1 max-w-[85%]">
				{!hideName && (
					<div className={cn('mb-1', isSelf ? 'text-right' : 'text-left')}>
						<Text className={cn(STYLES.chatMessage.timestamp, isSelf ? 'text-muted-foreground' : 'text-primary')}>{name}</Text>
					</div>
				)}

				<div className={cn(STYLES.chatMessage.bubble, 'text-sm leading-relaxed break-words whitespace-pre-wrap', isSelf ? STYLES.chatMessage.userBubble : STYLES.chatMessage.assistantBubble, isSelf ? 'ml-auto' : 'mr-auto')} style={{wordBreak: 'break-word', overflowWrap: 'anywhere'}}>
					{renderContent()}
				</div>
			</div>
		</div>
	)
}

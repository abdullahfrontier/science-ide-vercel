import React, {useEffect, useRef, useMemo} from 'react'
import {Card, Typography, Empty} from 'antd'
import {MessageOutlined} from '@ant-design/icons'
import {ChatMessage} from '@/components/chat/ChatMessage'
import {ChatMessageInput} from '@/components/chat/ChatMessageInput'
import {STYLES} from '@/lib/styles'
import {cn} from '@/lib/util'
import {VideoTrack, TrackReference} from '@livekit/components-react'

const inputHeight = 52

export type ChatMessageType = {
	name: string
	message: string
	isSelf: boolean
	timestamp: number
	localOnly?: boolean // Flag to indicate message should not be sent to agent
	type?: 'text' | 'image' // Message type
	logId?: string // Log ID for fetching image
	sessionId?: string // Session ID from backend
	organizationId?: string // Organization ID from backend
	experimentId?: string // Experiment ID from backend
}

type ChatTileProps = {
	messages: ChatMessageType[]
	onSend?: (message: string) => Promise<any>
	onImageUpload?: (imageUrl: string, originalName: string) => Promise<any>

	onTakePicture: () => void
	onUploadPicture: () => void
	onToggleCamera: () => void
	cameraInputEnabled: boolean
	isTogglingCamera: boolean

	// Two-way chat control props
	hasAgent?: boolean
	chatEnabled?: boolean
	onToggleChat?: () => void
	isTogglingChat?: boolean
	localVideoTrack: TrackReference
}

export const ChatTile = ({localVideoTrack, onTakePicture, onUploadPicture, onToggleCamera, cameraInputEnabled, isTogglingCamera, messages, onSend, onImageUpload, hasAgent, chatEnabled, onToggleChat, isTogglingChat}: ChatTileProps) => {
	const {Title, Text} = Typography
	const containerRef = useRef<HTMLDivElement>(null)

	useEffect(() => {
		if (containerRef.current) {
			containerRef.current.scrollTop = containerRef.current.scrollHeight
		}
	}, [messages])

	const renderLocalVideo = useMemo(() => {
		return (
			cameraInputEnabled &&
			localVideoTrack && (
				<div className="local-video-wrapper">
					<VideoTrack className="rounded-sm border border-gray-800 opacity-70 w-full" trackRef={localVideoTrack} />
				</div>
			)
		)
	}, [localVideoTrack, cameraInputEnabled])

	return (
		<div className="h-full w-full flex flex-col">
			<div ref={containerRef} className="flex-1 overflow-y-auto overflow-x-hidden p-4 min-h-0">
				{messages.length === 0 ? (
					<div className={cn(STYLES.flexCenter, 'h-full min-h-[200px]')}>
						<Empty
							image={<MessageOutlined className="text-5xl text-primary" />}
							description={
								<div className="text-center">
									<Title level={4} className="my-4 mb-2">
										Start a conversation
									</Title>
									<Text className="text-muted-foreground">Type a message below to begin chatting with the assistant.</Text>
								</div>
							}
						/>
					</div>
				) : (
					<div className="flex flex-col gap-2 pb-4">
						{messages.map((message, index, allMsg) => {
							const hideName = index >= 1 && allMsg[index - 1].name === message.name

							return <ChatMessage key={index} hideName={hideName} name={message.name} message={message.message} isSelf={message.isSelf} type={message.type} logId={message.logId} sessionId={message.sessionId} organizationId={message.organizationId} experimentId={message.experimentId} />
						})}
					</div>
				)}
			</div>
			{renderLocalVideo}
			<div className="flex-shrink-0 w-full border-t border-gray-200 bg-white absolute bottom-0">
				<ChatMessageInput onTakePicture={onTakePicture} onUploadPicture={onUploadPicture} onToggleCamera={onToggleCamera} cameraInputEnabled={cameraInputEnabled} isTogglingCamera={isTogglingCamera} height={inputHeight} placeholder="Type a message..." onSend={onSend} onImageUpload={onImageUpload} hasAgent={hasAgent} chatEnabled={chatEnabled} onToggleChat={onToggleChat} isTogglingChat={isTogglingChat} />
			</div>
		</div>
	)
}

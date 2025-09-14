import {ChatMessageType, ChatTile} from '@/components/chat/ChatTile'
import {TrackReferenceOrPlaceholder, TrackReference, useChat, useLocalParticipant, useTrackTranscription} from '@livekit/components-react'
import {LocalParticipant, Participant, Track, TranscriptionSegment} from 'livekit-client'
import {useEffect, useState, useCallback} from 'react'

interface TranscriptionTileProps {
	hasAgent: boolean
	onTakePicture: () => void
	onUploadPicture: () => void
	onToggleCamera: () => void
	cameraInputEnabled: boolean
	isTogglingCamera: boolean
	agentAudioTrack?: TrackReferenceOrPlaceholder
	localVideoTrack: TrackReference
	chatEnabled?: boolean
	onToggleChat?: () => void
	isTogglingChat?: boolean
	onChatSendReady?: (sendFunction: (message: string) => Promise<any>, addLocalMessage: (message: string) => void) => void
	externalMessages?: ChatMessageType[]
}

export function TranscriptionTile({localVideoTrack, agentAudioTrack, hasAgent, onTakePicture, onUploadPicture, onToggleCamera, cameraInputEnabled, isTogglingCamera, chatEnabled, onToggleChat, isTogglingChat, onChatSendReady, externalMessages = []}: TranscriptionTileProps) {
	const agentMessages = useTrackTranscription(agentAudioTrack || undefined)
	const localParticipant = useLocalParticipant()
	const localMessages = useTrackTranscription({
		publication: localParticipant.microphoneTrack,
		source: Track.Source.Microphone,
		participant: localParticipant.localParticipant
	})

	const [transcripts, setTranscripts] = useState<Map<string, ChatMessageType>>(new Map())
	const [messages, setMessages] = useState<ChatMessageType[]>([])
	const [localOnlyMessages, setLocalOnlyMessages] = useState<ChatMessageType[]>([])
	const {chatMessages, send: sendChat} = useChat()

	// Handle image upload by sending a message with the image
	const handleImageUpload = async (imageUrl: string, originalName: string) => {
		if (sendChat) {
			const imageMessage = `I've uploaded an image: "${originalName}"\n\nImage URL: ${imageUrl}\n\nThe image is now available at: ${window.location.origin}${imageUrl}`
			await sendChat(imageMessage)
		}
	}

	// Function to add local-only messages (like images) without sending to agent
	const addLocalMessage = useCallback((message: string) => {
		const newMessage: ChatMessageType = {
			name: 'You',
			message: message,
			timestamp: Date.now(),
			isSelf: true,
			localOnly: true
		}
		setLocalOnlyMessages((prev) => [...prev, newMessage])
	}, [])

	// Create a wrapped sendChat function that filters out image messages
	const wrappedSendChat = useCallback(
		async (message: string) => {
			if (!sendChat) return

			// Filter out image messages from being sent to the agent
			if (message.startsWith('[IMAGE]')) {
				console.log('Skipping image message to agent:', message)
				// Still return success to allow the message to appear in chat
				return Promise.resolve()
			}

			// Send all other messages normally
			return sendChat(message)
		},
		[sendChat]
	)

	useEffect(() => {
		if (wrappedSendChat && onChatSendReady) {
			onChatSendReady(wrappedSendChat, addLocalMessage)
		}
	}, [wrappedSendChat, addLocalMessage, onChatSendReady])

	useEffect(() => {
		if (agentAudioTrack) {
			agentMessages.segments.forEach((s) => transcripts.set(s.id, segmentToChatMessage(s, transcripts.get(s.id), agentAudioTrack.participant)))
		}

		localMessages.segments.forEach((s) => transcripts.set(s.id, segmentToChatMessage(s, transcripts.get(s.id), localParticipant.localParticipant)))

		const allMessages = Array.from(transcripts.values())
		for (const msg of chatMessages) {
			const isAgent = agentAudioTrack ? msg.from?.identity === agentAudioTrack.participant?.identity : msg.from?.identity !== localParticipant.localParticipant.identity
			const isSelf = msg.from?.identity === localParticipant.localParticipant.identity
			let name = msg.from?.name
			if (!name) {
				if (isAgent) {
					name = 'Agent'
				} else if (isSelf) {
					name = 'You'
				} else {
					name = 'Unknown'
				}
			}
			allMessages.push({
				name,
				message: msg.message,
				timestamp: msg.timestamp,
				isSelf: isSelf,
				localOnly: msg.message.startsWith('[IMAGE]') // Mark image messages as local-only
			})
		}

		// Add local-only messages (like images) to the display
		allMessages.push(...localOnlyMessages)

		// Add external messages (like image messages from data channel)
		console.log('📬 Adding external messages to chat:', externalMessages.length)
		allMessages.push(...externalMessages)

		allMessages.sort((a, b) => a.timestamp - b.timestamp)
		setMessages(allMessages)
	}, [transcripts, chatMessages, localParticipant.localParticipant, agentAudioTrack?.participant, agentMessages.segments, localMessages.segments, agentAudioTrack, localOnlyMessages, externalMessages])

	return (
		<div style={{height: '100%', display: 'flex', flexDirection: 'column'}}>
			<ChatTile localVideoTrack={localVideoTrack} onTakePicture={onTakePicture} onUploadPicture={onUploadPicture} onToggleCamera={onToggleCamera} cameraInputEnabled={cameraInputEnabled} isTogglingCamera={isTogglingCamera} messages={messages} onSend={sendChat} onImageUpload={handleImageUpload} hasAgent={hasAgent} chatEnabled={chatEnabled} onToggleChat={onToggleChat} isTogglingChat={isTogglingChat} />
		</div>
	)
}

function segmentToChatMessage(s: TranscriptionSegment, existingMessage: ChatMessageType | undefined, participant: Participant): ChatMessageType {
	const msg: ChatMessageType = {
		message: s.final ? s.text : `${s.text} ...`,
		name: participant instanceof LocalParticipant ? 'You' : 'Agent',
		isSelf: participant instanceof LocalParticipant,
		timestamp: existingMessage?.timestamp ?? Date.now()
	}
	return msg
}

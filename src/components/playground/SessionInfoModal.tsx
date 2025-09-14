import React from 'react'
import {Modal, Typography, Descriptions, Badge, Space} from 'antd'
import {useConnectionState, useLocalParticipant, useRoomInfo, useVoiceAssistant} from '@livekit/components-react'
import {ConnectionState} from 'livekit-client'
import {useConfig} from '@/hooks/useConfig'
import {LoadingSVG} from '@/components/button/LoadingSVG'

interface SessionInfoModalProps {
	open: boolean
	cameraInputEnabled: boolean
	onClose: () => void
}

export const SessionInfoModal: React.FC<SessionInfoModalProps> = ({open, cameraInputEnabled, onClose}) => {
	const {config} = useConfig()
	const roomState = useConnectionState()
	const {name} = useRoomInfo()
	const {localParticipant} = useLocalParticipant()
	const voiceAssistant = useVoiceAssistant()
	const {Title, Text} = Typography

	const getConnectionStatus = () => {
		switch (roomState) {
			case ConnectionState.Connected:
				return <Badge status="success" text="Connected" />
			case ConnectionState.Connecting:
				return <Badge status="processing" text="Connecting" />
			case ConnectionState.Disconnected:
				return <Badge status="default" text="Disconnected" />
			case ConnectionState.Reconnecting:
				return <Badge status="warning" text="Reconnecting" />
			default:
				return <Badge status="default" text={roomState} />
		}
	}

	const getAgentStatus = () => {
		if (voiceAssistant.agent) {
			return (
				<Space>
					<Badge status="success" />
					<Text>Connected: {voiceAssistant.agent.identity}</Text>
				</Space>
			)
		} else if (roomState === ConnectionState.Connected) {
			return (
				<Space>
					<LoadingSVG diameter={12} strokeWidth={2} />
					<Text>Waiting for agent...</Text>
				</Space>
			)
		} else {
			return (
				<Space>
					<Badge status="default" />
					<Text>Not connected</Text>
				</Space>
			)
		}
	}

	return (
		<Modal
			title={
				<Space>
					<span>📊</span>
					<Title level={4} style={{margin: 0}}>
						Session Information
					</Title>
				</Space>
			}
			open={open}
			onCancel={onClose}
			footer={null}
			width={500}>
			<Descriptions column={1} bordered size="small">
				<Descriptions.Item label="Description">
					<Text>{config.description || 'No description available'}</Text>
				</Descriptions.Item>

				<Descriptions.Item label="Room Status">{getConnectionStatus()}</Descriptions.Item>

				<Descriptions.Item label="Room Name">
					<Text code>{roomState === ConnectionState.Connected ? name || 'Loading...' : config.settings.room_name || 'Not set'}</Text>
				</Descriptions.Item>

				<Descriptions.Item label="Participant">
					<Text code>{roomState === ConnectionState.Connected ? localParticipant?.identity || 'Loading...' : config.settings.participant_name || 'Not set'}</Text>
				</Descriptions.Item>

				<Descriptions.Item label="Agent Status">{getAgentStatus()}</Descriptions.Item>

				{voiceAssistant.audioTrack && (
					<Descriptions.Item label="Audio Track">
						<Badge status="success" text="Active" />
					</Descriptions.Item>
				)}

				<Descriptions.Item label="Chat Enabled">
					<Badge status={config.settings.chat ? 'success' : 'default'} text={config.settings.chat ? 'Yes' : 'No'} />
				</Descriptions.Item>

				<Descriptions.Item label="Camera Input">
					<Badge status={cameraInputEnabled ? 'success' : 'default'} text={cameraInputEnabled ? 'Enabled' : 'Disabled'} />
				</Descriptions.Item>

				<Descriptions.Item label="Microphone Input">
					<Badge status={config.settings.inputs.mic ? 'success' : 'default'} text={config.settings.inputs.mic ? 'Enabled' : 'Disabled'} />
				</Descriptions.Item>
			</Descriptions>
		</Modal>
	)
}

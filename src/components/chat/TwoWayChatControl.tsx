import React from 'react'
import {Tooltip, Button} from 'antd'
import {AudioOutlined, AudioMutedOutlined, RobotOutlined, LoadingOutlined, CloseOutlined} from '@ant-design/icons'

interface TwoWayChatControlProps {
	hasAgent: boolean
	chatEnabled: boolean
	onToggleChat: () => void
	isToggling: boolean
}

export const TwoWayChatControl: React.FC<TwoWayChatControlProps> = ({hasAgent, chatEnabled, onToggleChat, isToggling}) => {
	const getTooltipText = () => {
		if (!hasAgent) return 'No agent connected'
		if (isToggling) return 'Switching...'
		return chatEnabled ? 'Turn off Voice Assistant' : 'Turn on Voice Assistant'
	}

	return (
		<Tooltip title={getTooltipText()} placement="top">
			<Button size="large" icon={chatEnabled ? <AudioMutedOutlined /> : <AudioOutlined />} onClick={onToggleChat} disabled={!hasAgent || isToggling} />
		</Tooltip>
	)
}

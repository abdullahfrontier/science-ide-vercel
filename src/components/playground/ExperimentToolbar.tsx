import React from 'react'
import {Tooltip} from 'antd'
import {InfoCircleOutlined} from '@ant-design/icons'

interface ExperimentToolbarProps {
	hasAgent: boolean
	handleShowSessionInfo: () => Promise<void>
}

export const ExperimentToolbar: React.FC<ExperimentToolbarProps> = ({hasAgent, handleShowSessionInfo}) => {
	const buttonStyle = {
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'center',
		width: '36px',
		height: '36px',
		borderRadius: '8px',
		border: '1px solid var(--border)',
		background: 'var(--background)',
		color: 'var(--foreground)',
		cursor: hasAgent ? 'pointer' : 'not-allowed',
		transition: 'all 0.2s ease',
		fontSize: '14px'
	}

	return (
		<div className="flex items-center lg:gap-2">
			<Tooltip title="Session Information">
				<button onClick={() => handleShowSessionInfo()} className="!w-[28px] lg:!w-[36px]" style={buttonStyle}>
					<InfoCircleOutlined style={{fontSize: '16px'}} />
				</button>
			</Tooltip>
		</div>
	)
}

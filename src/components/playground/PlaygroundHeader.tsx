import React, {ReactNode} from 'react'
import {Button, Space, Typography} from 'antd'
import {GithubOutlined} from '@ant-design/icons'

import {useConfig} from '@/hooks/useConfig'
import {ExperimentToolbar} from '@/components/playground/ExperimentToolbar'
import {SettingsDropdown} from '@/components/playground/SettingsDropdown'

type PlaygroundHeader = {
	title?: ReactNode
	githubLink?: string
	height: number
	experimentPicker?: ReactNode
	hasAgent: boolean
	handleShowSessionInfo: () => Promise<void>
}

export const PlaygroundHeader = ({title, githubLink, height, experimentPicker, hasAgent, handleShowSessionInfo}: PlaygroundHeader) => {
	const {config} = useConfig()
	const {Text} = Typography

	return (
		<div
			className="pt-2 md:pt-0 p-0 flex justify-between items-center"
			style={{
				height: height + 'px',
				borderBottom: '1px solid var(--border)',
				backgroundColor: 'var(--card)',
				backdropFilter: 'blur(8px)'
			}}>
			<div className="flex flex-col md:flex-row  md:items-center justify-between md:gap-3 flex-[2]">
				{experimentPicker && (
					<div className="flex items-center md:justify-center  md:pr-[8px] lg:pr-24 gap-2 lg:gap-3">
						<Text strong className="text-[12px] lg:text-[14px]" style={{color: 'var(--foreground)'}}>
							Experiment:
						</Text>
						{experimentPicker}
					</div>
				)}
			</div>

			<div className="flex flex-col items-end md:flex-row  md:items-center md:gap-[0.5rem] lg:gap-2 lg:flex-1 justify-end">
				<ExperimentToolbar hasAgent={hasAgent} handleShowSessionInfo={handleShowSessionInfo} />

				<Space size="middle">
					{githubLink && <Button type="text" icon={<GithubOutlined />} href={githubLink} target="_blank" style={{color: 'var(--muted-foreground)'}} />}
					{config.settings.editable && <SettingsDropdown />}
				</Space>
			</div>
		</div>
	)
}

import React, {ReactNode} from 'react'
import {Typography} from 'antd'

interface MainHeadingProps {
	title?: string
	text?: string
	icon?: ReactNode
}

export const MainHeading = ({title, text, icon}: MainHeadingProps) => {
	const {Title, Text} = Typography
	return (
		<div>
			<Title level={2} className="!text-[24px] sm:!text-[30px]">
				{icon && <span className="mr-2">{icon}</span>}
				{title}
			</Title>
			{text && <Text type="secondary">{text}</Text>}
		</div>
	)
}

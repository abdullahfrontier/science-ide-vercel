import React from 'react'
import {Button, Card, Typography, Space} from 'antd'
import {InfoCircleOutlined} from '@ant-design/icons'

interface InfoItem {
	text: string
}

interface InfoBoxProps {
	title: string
	infoList: InfoItem[]
}

export const InfoCard = ({title, infoList}: InfoBoxProps) => {
	const {Text} = Typography

	return (
		<Card size="small" className="my-6 bg-light-gray">
			<Space direction="vertical" size="small">
				<Text strong>
					<InfoCircleOutlined /> {title}
				</Text>
				<ul style={{margin: 0, paddingLeft: '20px'}}>
					{infoList.map((item, index) => (
						<li key={index}>
							<Text type="secondary" style={{fontSize: '13px'}}>
								{item?.text}
							</Text>
						</li>
					))}
				</ul>
			</Space>
		</Card>
	)
}

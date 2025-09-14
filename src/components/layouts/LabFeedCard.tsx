import React, {useEffect, useState} from 'react'
import {Card, Typography, Space, Divider, Spin, Timeline, Tag} from 'antd'
import {RadarChartOutlined} from '@ant-design/icons'
import {MainHeading} from '@/components/common/MainHeading'

import {useSelector} from 'react-redux'
import {RootState} from '@/store'
import {doGetLabFeed} from '@/api'

const LabFeedCard = () => {
	const {Title, Text} = Typography

	const {currentOrganization} = useSelector((state: RootState) => state.auth)
	const [labFeedLoading, setLabFeedLoading] = useState(true)
	const [labFeedData, setLabFeedData] = useState([])

	useEffect(() => {
		const fetchLabFeed = async () => {
			try {
				const data = await doGetLabFeed({orgId: currentOrganization?.org_id!})
				setLabFeedData(data.labFeed || [])
			} catch (error) {
				console.log(error)
			} finally {
				setLabFeedLoading(false)
			}
		}
		fetchLabFeed()
	}, [currentOrganization?.org_id])

	return (
		<Card>
			<MainHeading icon={<RadarChartOutlined />} title={'Lab Feed'} text={'Recent activity from experiments across the lab'} />

			<Divider />

			{labFeedLoading ? (
				<div className="text-center py-12">
					<Spin size="large" />
					<div className="mt-4">
						<Text type="secondary">Loading lab feed...</Text>
					</div>
				</div>
			) : labFeedData?.length === 0 ? (
				<div className="text-center py-12">
					<div className="text-5xl mb-4">🔬</div>
					<Title level={4}>No Recent Activity</Title>
					<Text type="secondary">No experiments with recent logs found. Start an experiment to see activity here.</Text>
				</div>
			) : (
				<Timeline mode="left">
					{labFeedData?.map((log: any, index: number) => (
						<Timeline.Item className="time-line-date" key={log.id || index} label={new Date(log.timestamp).toLocaleString()}>
							<Card size="small">
								<Space direction="vertical" size="small">
									<Text strong>
										Experiment {log.experiment_id}: {log.experiment_title}
									</Text>
									<Text className="text-xs text-muted-foreground">
										by {log.user_name} • Created {new Date(log.experiment_created_at).toLocaleDateString()}
									</Text>
									<Text>
										<Tag color="blue">{log.speaker}</Tag>
										{log.content && log.content.length > 200 ? `${log.content.substring(0, 200)}...` : log.content || 'No content'}
									</Text>
								</Space>
							</Card>
						</Timeline.Item>
					))}
				</Timeline>
			)}
		</Card>
	)
}

export default LabFeedCard

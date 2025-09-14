import React from 'react'
import {Form, Input, Typography, Space, Spin} from 'antd'

export const FullPageLoader = ({message = 'Loading...'}) => {
	return (
		<div className="min-h-screen flex items-center justify-center" data-testid="full-page-loader">
			<Space size="middle">
				<Spin size="large" />
				<Typography.Text type="secondary">{message}</Typography.Text>
			</Space>
		</div>
	)
}

import React, {useEffect} from 'react'
import {useSelector} from 'react-redux'
import {RootState} from '@/store'

import {Button, Typography, Space, Card} from 'antd'
import {GoogleOutlined, ExperimentOutlined} from '@ant-design/icons'
import {cognitoAuth} from '@/lib/cognito-auth'
import {FullPageLoader} from '../common/FullPageLoader'

export const LoginForm = () => {
	const {isAuthenticated, loading: authLoading} = useSelector((state: RootState) => state.auth)

	const handleGoogleLogin = async () => {
		try {
			await cognitoAuth.loginWithGoogle()
		} catch (error) {
			console.error('Failed to initiate Google login:', error)
			// You could add error handling UI here if needed
		}
	}

	if (authLoading) {
		return <FullPageLoader />
	}

	if (isAuthenticated) return null

	return (
		<div className="min-h-screen flex items-center justify-center px-4" style={{backgroundColor: 'var(--background)'}}>
			<div className="w-full max-w-md">
				<div className="text-center mb-8">
					<Space direction="vertical" size="small">
						<ExperimentOutlined style={{fontSize: '48px', color: 'var(--primary)'}} />
						<Typography.Title level={2} style={{margin: 0, color: 'var(--foreground)'}}>
							Eureka Lab Assistant
						</Typography.Title>
						<Typography.Text type="secondary">Sign in to access your experiments</Typography.Text>
					</Space>
				</div>

				<Card style={{width: '100%'}} bordered={true} className="shadow-lg">
					<Space direction="vertical" size="large" style={{width: '100%'}}>
						<Button type="primary" icon={<GoogleOutlined />} size="large" block onClick={handleGoogleLogin} style={{height: '48px'}}>
							Sign in with Google
						</Button>

						<div className="text-center mt-6">
							<Typography.Text type="secondary" style={{fontSize: '14px'}}>
								By signing in, you agree to our Terms of Service and Privacy Policy
							</Typography.Text>
						</div>
					</Space>
				</Card>
			</div>
		</div>
	)
}

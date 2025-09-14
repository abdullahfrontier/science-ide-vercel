import React, {useEffect, useState} from 'react'
import {useRouter} from 'next/router'
import {useDispatch, useSelector} from 'react-redux'
import {RootState, AppDispatch} from '@/store'

import {logout} from '@/store/thunks/authThunk'

import {Card, Typography, Space, Button, List, Form, Input, message} from 'antd'
import {PlusOutlined, TeamOutlined, LogoutOutlined} from '@ant-design/icons'
import {Organization} from '@/types/organization'
import {updateOrganizations, updateCurrentOrganization} from '@/store/slices/authSlice'
import {FullPageLoader} from '@/components/common/FullPageLoader'

import {doGetUserOrganizations, doCreateOrganization} from '@/api'
const {Title, Text} = Typography

export default function SelectOrganization() {
	const router = useRouter()
	const dispatch = useDispatch<AppDispatch>()
	const {user, orginizations, currentOrganization: _currentOrganization} = useSelector((state: RootState) => state.auth)

	const [showCreateForm, setShowCreateForm] = useState(false)
	const [creating, setCreating] = useState(false)
	const [form] = Form.useForm()

	const [organizationsLoading, setOrganizationsLoading] = useState(true)
	const [organizations, setOrganizations] = useState<Organization[]>([])
	const [currentOrganization, setCurrentOrganization] = useState<Organization | null>(null)
	const [error, setError] = useState('')

	useEffect(() => {
		const fetchOrginizations = async () => {
			try {
				setOrganizationsLoading(true)
				const response = await doGetUserOrganizations({email: user?.email!})
				setOrganizations(response.organizations || [])
				dispatch(updateOrganizations(response.organizations || []))
				if (response.organizations.length === 0) {
					setShowCreateForm(true)
				} else if (response.organizations.length === 1) {
					handleSelectOrganization(response.organizations[0])
				}
				if (currentOrganization && !response.organizations.some((org: Organization) => org.org_id === currentOrganization.org_id)) {
					setCurrentOrganization(null)
				}
			} catch (err) {
				console.error('Failed to fetch organizations:', err)
				// Don't set error state if it's an auth error - let the auth system handle it
				// if (err instanceof Error && err.message.includes('Authentication')) {
				// 	// Auth error will be handled by apiClient/authManager
				// 	return
				// }
				setError('Failed to load organizations')
				setOrganizations([])
			} finally {
				setOrganizationsLoading(false)
			}
		}
		fetchOrginizations()
	}, [currentOrganization?.org_id])

	const handleSelectOrganization = (org: Organization) => {
		dispatch(updateCurrentOrganization(org))
		setCurrentOrganization(org)
		router.push('/')
	}

	const handleCreateOrganization = async (values: {name: string}) => {
		setCreating(true)
		try {
			const response = await doCreateOrganization({name: values.name})
			if (response.organization) {
				let _orginizations: Organization[] = []
				const exists = orginizations?.some((org) => org.org_id === response.organization.org_id)
				if (!exists) {
					_orginizations = [...(orginizations || []), response.organization]
				} else {
					// replace the existing one
					_orginizations = orginizations?.map((org) => (org.org_id === response.organization.org_id ? response.organization : org)) || []
				}
				setOrganizations((prev) => [...prev, response.organization])
				message.success('Organization created successfully!')

				dispatch(updateOrganizations(_orginizations || []))

				handleSelectOrganization(response.organization)
			} else {
				message.success('Failed to create organization')
			}
		} catch (err) {
			message.error(err instanceof Error ? err.message : 'Failed to create organization')
		} finally {
			setCreating(false)
		}
	}

	if (organizationsLoading) {
		return <FullPageLoader message="Loading organizations..." />
	}

	if (organizations.length === 1) {
		return <FullPageLoader message="Setting up workspace..." />
	}

	return (
		<div className="min-h-screen flex items-center justify-center px-4" style={{backgroundColor: 'var(--background)'}}>
			<div className="w-full max-w-2xl">
				<Space direction="vertical" size="large" className="w-full">
					<div className="text-center">
						<TeamOutlined style={{fontSize: '48px', color: 'var(--primary)'}} />
						<Title level={2} style={{marginTop: 16}}>
							{organizations.length === 0 ? 'Create Your Organization' : 'Select Organization'}
						</Title>
						<Text type="secondary">{organizations.length === 0 ? 'You need to create an organization to get started' : 'Choose which organization you want to work with'}</Text>
						{user && (
							<div style={{marginTop: 16}}>
								<Text>
									You are logged in as: <strong>{user.email}</strong>
								</Text>
							</div>
						)}
					</div>

					{error && (
						<Card bordered={false} style={{backgroundColor: '#fff2f0'}}>
							<Text type="danger">{error}</Text>
						</Card>
					)}

					{!showCreateForm && organizations.length > 0 && (
						<>
							<Card>
								<List
									dataSource={organizations}
									renderItem={(org) => (
										<List.Item
											actions={[
												<Button key="select" type="primary" onClick={() => handleSelectOrganization(org)}>
													Select
												</Button>
											]}>
											<List.Item.Meta avatar={<TeamOutlined style={{fontSize: '24px'}} />} title={org.name} description={`Created: ${new Date(org.created_at).toLocaleDateString()}`} />
										</List.Item>
									)}
								/>
							</Card>

							<Button icon={<PlusOutlined />} onClick={() => setShowCreateForm(true)} block>
								Create New Organization
							</Button>
						</>
					)}

					{showCreateForm && (
						<Card>
							<Form form={form} layout="vertical" onFinish={handleCreateOrganization}>
								<Form.Item
									label="Organization Name"
									name="name"
									rules={[
										{required: true, message: 'Please enter organization name'},
										{min: 3, message: 'Name must be at least 3 characters'},
										{max: 50, message: 'Name must be less than 50 characters'}
									]}>
									<Input placeholder="Enter organization name" size="large" disabled={creating} />
								</Form.Item>

								<Space className="w-full justify-end">
									{organizations.length > 0 && (
										<Button
											onClick={() => {
												setShowCreateForm(false)
												form.resetFields()
											}}
											disabled={creating}>
											Cancel
										</Button>
									)}
									<Button type="primary" htmlType="submit" loading={creating}>
										Create Organization
									</Button>
								</Space>
							</Form>
						</Card>
					)}

					<div style={{marginTop: 32, textAlign: 'center'}}>
						<Button icon={<LogoutOutlined />} onClick={() => dispatch(logout())} danger>
							Logout
						</Button>
					</div>
				</Space>
			</div>
		</div>
	)
}

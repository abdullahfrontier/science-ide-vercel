import React, {useState, useEffect} from 'react'
import {Card, Typography, Space, Button, Form, Input, message, Divider} from 'antd'
import {UserOutlined, SaveOutlined, CompassOutlined} from '@ant-design/icons'

import {useDispatch, useSelector} from 'react-redux'
import {RootState, AppDispatch} from '@/store'

import {MainHeading} from '../common/MainHeading'
import {doUpdateUser} from '@/api'
import {updateUser} from '@/store/slices/authSlice'

const {Text} = Typography

const Profile = () => {
	const dispatch = useDispatch<AppDispatch>()
	const {user, currentOrganization} = useSelector((state: RootState) => state.auth)
	const [form] = Form.useForm()
	const [loading, setLoading] = useState(false)
	const [initialValues, setInitialValues] = useState({name: ''})
	const [formChanged, setFormChanged] = useState(false)

	useEffect(() => {
		if (user) {
			const values = {name: user.name, orginization: currentOrganization?.name, email: user.email}
			setInitialValues(values)
			form.setFieldsValue(values)
		}
	}, [user, form, currentOrganization?.name])

	const handleSubmit = async (values: {name: string}) => {
		if (!user) return
		setLoading(true)
		try {
			await doUpdateUser({email: user.email, name: values.name})
			dispatch(updateUser({...user, name: values.name.trim()}))
			setInitialValues({name: values.name.trim()})
			setFormChanged(false)
			message.success('Profile updated successfully!')
		} catch (error) {
			console.error('Profile update error:', error)
			message.error(error instanceof Error ? error.message : 'Failed to update profile')
		} finally {
			setLoading(false)
		}
	}

	const handleCancel = () => {
		form.setFieldsValue(initialValues)
		setFormChanged(false)
	}

	return (
		<Card>
			<MainHeading icon={<UserOutlined />} title={'Edit Profile'} text={'Update your personal information'} />
			<Divider />

			<Space direction="vertical" size="large" className="w-full">
				<Form
					form={form}
					layout="vertical"
					onFinish={handleSubmit}
					initialValues={initialValues}
					onValuesChange={(changedValues, allValues) => {
						// Check if form has actually changed from initial values
						const changed = allValues.name !== initialValues.name
						setFormChanged(changed)
					}}>
					<Space direction="vertical" size="middle" className="w-full">
						<Form.Item
							label="Full Name"
							name="name"
							rules={[
								{required: true, message: 'Please enter your name'},
								{min: 1, message: 'Name must be at least 1 character'},
								{max: 255, message: 'Name must be less than 255 characters'},
								{
									validator: (_, value) => {
										if (value && value.trim().length === 0) {
											return Promise.reject('Name cannot be empty')
										}
										return Promise.resolve()
									}
								}
							]}>
							<Input prefix={<UserOutlined />} placeholder="Enter your name" size="large" />
						</Form.Item>

						<Form.Item label="Email Address" name="email">
							<Input disabled prefix={<UserOutlined />} placeholder="Email" size="large" />
						</Form.Item>

						<Form.Item label="Orginization" name="orginization">
							<Input disabled prefix={<CompassOutlined />} placeholder="Your orginization" size="large" />
						</Form.Item>

						<div>
							<Text type="secondary">Account Created</Text>
							<div style={{marginTop: 8}}>
								<Text>
									{user?.created_at
										? new Date(user?.created_at).toLocaleDateString('en-US', {
												year: 'numeric',
												month: 'long',
												day: 'numeric',
												hour: '2-digit',
												minute: '2-digit'
											})
										: 'Date not available'}
								</Text>
							</div>
						</div>

						<Space style={{marginTop: 24}}>
							<Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={loading} disabled={!formChanged}>
								Save Changes
							</Button>
							<Button onClick={handleCancel} disabled={loading || !formChanged}>
								Cancel
							</Button>
						</Space>
					</Space>
				</Form>
			</Space>
		</Card>
	)
}

export default Profile

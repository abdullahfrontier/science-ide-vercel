import React from 'react'
import {Form, Input, Card, Typography, Space} from 'antd'
import {UserOutlined, MailOutlined, InfoCircleOutlined} from '@ant-design/icons'
import {useFormValidation} from '@/hooks/useFormValidation'
import {BaseForm} from '@/components/common/BaseForm'

import {useSelector} from 'react-redux'
import {RootState} from '@/store'
import {doAddUserToOrganization} from '@/api'

interface RegistrationFormProps {
	onUserRegistered?: () => void
}

const RegistrationForm = ({onUserRegistered}: RegistrationFormProps) => {
	const {currentOrganization} = useSelector((state: RootState) => state.auth)
	const {Text} = Typography
	const [form] = Form.useForm()

	const {loading, error, success, handleSubmit, setSuccess, resetState} = useFormValidation({
		onSuccess: onUserRegistered,
		resetOnSuccess: false
	})

	const onFinish = async (values: {email: string}) => {
		await handleSubmit(async () => {
			return await doAddUserToOrganization({email: values.email.trim(), orgId: currentOrganization?.org_id!})
		})
	}

	const resetForm = () => {
		setSuccess(false)
		resetState()
		form.resetFields()
	}

	return (
		<BaseForm
			title="Add User to Organization"
			icon={<UserOutlined />}
			onFinish={onFinish}
			loading={loading}
			error={error}
			success={success}
			successMessage={`User has been successfully added to ${currentOrganization?.name}.`}
			successAction={{
				label: 'Add Another User',
				onClick: resetForm //() => setSuccess(false)
			}}
			submitButtonText="Add User to Organization"
			formProps={{
				form: form
			}}>
			<div style={{marginBottom: '24px'}}>
				<Text type="secondary" style={{fontSize: '16px'}}>
					Adds a user to the current organization: <strong>{currentOrganization?.name}</strong>
				</Text>
			</div>

			<Form.Item
				label="Email Address"
				name="email"
				rules={[
					{required: true, message: 'Please enter your email address'},
					{type: 'email', message: 'Please enter a valid email address'}
				]}>
				<Input prefix={<MailOutlined />} placeholder="Enter your email address" />
			</Form.Item>

			<Card size="small" style={{marginTop: '24px', backgroundColor: '#f9f9f9'}}>
				<Space direction="vertical" size="small">
					<Text strong>
						<InfoCircleOutlined /> User Addition Information
					</Text>
					<ul style={{margin: 0, paddingLeft: '20px'}}>
						<li>
							<Text type="secondary" style={{fontSize: '13px'}}>
								The user will be added to <strong>{currentOrganization?.name}</strong>
							</Text>
						</li>
						<li>
							<Text type="secondary" style={{fontSize: '13px'}}>
								They will be able to create and participate in experiments within this organization
							</Text>
						</li>
						<li>
							<Text type="secondary" style={{fontSize: '13px'}}>
								Users can belong to multiple organizations
							</Text>
						</li>
						<li>
							<Text type="secondary" style={{fontSize: '13px'}}>
								No password is required - users will set their own password when they first log in
							</Text>
						</li>
						<li>
							<Text type="secondary" style={{fontSize: '13px'}}>
								Users will provide their own name when they register
							</Text>
						</li>
					</ul>
				</Space>
			</Card>
		</BaseForm>
	)
}

export default RegistrationForm

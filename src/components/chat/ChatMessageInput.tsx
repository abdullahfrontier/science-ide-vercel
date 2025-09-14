import React, {useCallback, useState, useRef} from 'react'
import {useSelector} from 'react-redux'
import type {RootState} from '@/store'
import {Input, Dropdown, Button, Space, Tooltip, message as antMessage} from 'antd'
import {VideoCameraOutlined, VideoCameraAddOutlined, SendOutlined, PictureOutlined, CameraOutlined, PlusOutlined} from '@ant-design/icons'

import {TwoWayChatControl} from './TwoWayChatControl'
import {useAuthHeaders} from '@/hooks/useAuthHeaders'

type ChatMessageInput = {
	placeholder: string
	height: number
	onSend?: (message: string) => Promise<any>
	onImageUpload?: (imageUrl: string, originalName: string) => Promise<any>

	onTakePicture: () => void
	onUploadPicture: () => void
	onToggleCamera: () => void
	cameraInputEnabled: boolean
	isTogglingCamera: boolean

	hasAgent?: boolean
	chatEnabled?: boolean
	onToggleChat?: () => void
	isTogglingChat?: boolean
}

export const ChatMessageInput = ({onTakePicture, onUploadPicture, onToggleCamera, cameraInputEnabled, isTogglingCamera, placeholder, height, onSend, onImageUpload, hasAgent = false, chatEnabled = false, onToggleChat, isTogglingChat = false}: ChatMessageInput) => {
	const [message, setMessage] = useState('')
	const [loading, setLoading] = useState(false)
	const [uploading, setUploading] = useState(false)
	const fileInputRef = useRef<HTMLInputElement>(null)
	const {isAuthenticated} = useSelector((state: RootState) => state.auth)
	const {getAuthHeaders} = useAuthHeaders()

	const handleSend = useCallback(async () => {
		if (!onSend || message.trim() === '') {
			return
		}
		setLoading(true)
		try {
			await onSend(message)
			setMessage('')
		} catch (error) {
			console.error('Failed to send message:', error)
		} finally {
			setLoading(false)
		}
	}, [onSend, message])

	const handleImageUpload = useCallback(
		async (file: File) => {
			if (!onImageUpload) {
				antMessage.error('Image upload not supported')
				return false
			}
			if (!isAuthenticated) {
				antMessage.error('Please log in to upload images')
				return false
			}

			// Validate file size (10MB limit)
			const maxSize = 10 * 1024 * 1024
			if (file.size > maxSize) {
				antMessage.error('File size must be less than 10MB')
				return false
			}
			// Validate file type
			const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
			if (!validTypes.includes(file.type)) {
				antMessage.error('Please upload a valid image file (JPEG, PNG, GIF, or WebP)')
				return false
			}

			setUploading(true)
			try {
				const formData = new FormData()
				formData.append('image', file)

				const {'Content-Type': _, ...uploadHeaders} = getAuthHeaders()

				console.log('🔑 Auth headers:', uploadHeaders)
				console.log('📁 FormData entries:')
				Array.from(formData.entries()).forEach(([key, value]) => {
					console.log(`  ${key}:`, value)
				})

				const response = await fetch('/api/upload-image', {
					method: 'POST',
					headers: uploadHeaders,
					body: formData
				})

				console.log('📡 Upload response status:', response.status)

				if (!response.ok) {
					console.error('Upload response not OK:', response.status, response.statusText)
					const errorData = await response.json().catch(() => ({error: 'Upload failed'}))
					console.error('Upload error data:', errorData)
					throw new Error(errorData.error || 'Upload failed')
				}

				const result = await response.json()

				if (result.success && result.imageUrl) {
					await onImageUpload(result.imageUrl, file.name)
					antMessage.success(`Image "${file.name}" uploaded successfully`)
				} else {
					throw new Error('Upload failed')
				}
			} catch (error) {
				console.error('Failed to upload image:', error)
				antMessage.error(`Failed to upload image: ${error instanceof Error ? error.message : 'Unknown error'}`)
			} finally {
				setUploading(false)
			}
			return false // Prevent default upload behavior
		},
		[onImageUpload, getAuthHeaders, isAuthenticated]
	)

	const handleFileChange = useCallback(
		(event: React.ChangeEvent<HTMLInputElement>) => {
			const file = event.target.files?.[0]
			if (file) {
				handleImageUpload(file)
			}
			// Reset the input value to allow selecting the same file again
			event.target.value = ''
		},
		[handleImageUpload]
	)

	return (
		<div
			style={{
				height: height,
				borderTop: '1px solid var(--border)',
				backgroundColor: 'var(--card)',
				backdropFilter: 'blur(8px)',
				padding: '4px',
				display: 'flex',
				alignItems: 'center',
				gap: '4px'
			}}>
			<Space.Compact style={{flex: 1}}>
				<Input placeholder={placeholder} value={message} onChange={(e) => setMessage(e.target.value)} onPressEnter={handleSend} disabled={loading || uploading} size="large" style={{flex: 1}} />
				<Button type="primary" icon={<SendOutlined />} onClick={handleSend} disabled={message.trim().length === 0 || !onSend || uploading} loading={loading} size="large"></Button>
				{onToggleChat && <TwoWayChatControl hasAgent={hasAgent} chatEnabled={chatEnabled} onToggleChat={onToggleChat} isToggling={isTogglingChat} />}
				<Tooltip title={cameraInputEnabled ? 'Turn Off Camera' : 'Turn On Camera'} placement="top">
					<Button icon={cameraInputEnabled ? <VideoCameraOutlined /> : <VideoCameraAddOutlined />} onClick={onToggleCamera} size="large" disabled={!hasAgent || isTogglingCamera} />
				</Tooltip>
				<Tooltip title="Take Picture" placement="top">
					<Button icon={<CameraOutlined />} onClick={onTakePicture} size="large" disabled={!hasAgent} />
				</Tooltip>
				<Tooltip title="Upload Picture" placement="top">
					<Button icon={<PictureOutlined />} onClick={onUploadPicture} size="large" disabled={!hasAgent} />
				</Tooltip>
			</Space.Compact>
			{onImageUpload && <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} style={{display: 'none'}} />}
		</div>
	)
}

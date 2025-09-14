import {NextApiRequest, NextApiResponse} from 'next'
import {generateRandomAlphanumeric} from '@/lib/util'

import {AccessToken, RoomServiceClient} from 'livekit-server-sdk'
import type {AccessTokenOptions, VideoGrant} from 'livekit-server-sdk'
import {TokenResult} from '../../lib/types'

const apiKey = process.env.LIVEKIT_API_KEY
const apiSecret = process.env.LIVEKIT_API_SECRET

const createToken = (userInfo: AccessTokenOptions, grant: VideoGrant) => {
	const at = new AccessToken(apiKey, apiSecret, userInfo)
	at.addGrant(grant)
	return at.toJwt()
}

export default async function handleToken(req: NextApiRequest, res: NextApiResponse) {
	try {
		if (!apiKey || !apiSecret) {
			console.error('❌ LiveKit API credentials not configured')
			return res.status(500).json({
				error: 'LiveKit configuration error',
				message: "Environment variables aren't set up correctly"
			})
		}

		// Get org_id from query params (required for room naming)
		const orgId = req.query.orgId as string

		// Get room name from query params or generate random one with org_id prefix
		const roomName = (req.query.roomName as string) || `${orgId || 'default'}-room-${generateRandomAlphanumeric(4)}-${generateRandomAlphanumeric(4)}`

		// Get participant name from query params or generate random one
		const identity = (req.query.participantName as string) || `identity-${generateRandomAlphanumeric(4)}`

		// Get experiment ID, user ID, location, JWT access token, and user email from query params
		const experimentId = req.query.experimentId as string
		const userId = req.query.userId as string
		const latitude = req.query.latitude as string
		const longitude = req.query.longitude as string
		const accessToken = req.query.accessToken as string
		const userEmail = req.query.userEmail as string

		console.log('🎫 Token API - Received params:', {
			orgId,
			experimentId,
			userId,
			roomName,
			identity,
			hasAccessToken: !!accessToken,
			userEmail,
			latitude,
			longitude
		})

		// Create room with metadata using RoomServiceClient
		if (process.env.LIVEKIT_WS_URL) {
			try {
				const roomService = new RoomServiceClient(process.env.LIVEKIT_WS_URL.replace('wss://', 'https://').replace('ws://', 'http://'), apiKey!, apiSecret!)

				// Prepare room metadata with creator's JWT for delegation
				const roomMetadata = {
					experiment_id: experimentId || undefined,
					org_id: orgId || undefined,
					requested_by_user_email: userEmail || undefined,
					creator_access_token: accessToken || undefined, // Room creator's JWT for delegation
					created_at: new Date().toISOString()
				}

				console.log('🏗️ Creating room with metadata:', roomMetadata)

				// Create or update the room
				await roomService.createRoom({
					name: roomName,
					metadata: JSON.stringify(roomMetadata),
					// Optional room configuration
					emptyTimeout: 300, // 5 minutes
					maxParticipants: 10
				})

				console.log('✅ Room created/updated successfully:', roomName)
			} catch (error) {
				// If room already exists, try to update its metadata
				console.log('⚠️ Room creation error (may already exist):', error)
				try {
					const roomService = new RoomServiceClient(process.env.LIVEKIT_WS_URL!.replace('wss://', 'https://').replace('ws://', 'http://'), apiKey!, apiSecret!)

					// Update existing room metadata
					const roomMetadata = {
						experiment_id: experimentId || undefined,
						org_id: orgId || undefined,
						requested_by_user_email: userEmail || undefined,
						creator_access_token: accessToken || undefined, // Room creator's JWT for delegation
						updated_at: new Date().toISOString()
					}

					await roomService.updateRoomMetadata(roomName, JSON.stringify(roomMetadata))
					console.log('✅ Room metadata updated successfully:', roomName)
				} catch (updateError) {
					console.log('❌ Could not update room metadata:', updateError)
					// Continue anyway - the room will be created when participant joins
				}
			}
		}

		const grant: VideoGrant = {
			room: roomName,
			roomJoin: true,
			canPublish: true,
			canPublishData: true,
			canSubscribe: true
		}

		// Add participant-specific metadata only (no room-level data or JWT)
		const tokenOptions: AccessTokenOptions = {
			identity,
			ttl: '10 days' // Set token expiration to 10 days
		}
		const metadata: any = {}
		// Only include participant-specific information
		if (userId) {
			const userIdNum = parseInt(userId, 10)
			if (!isNaN(userIdNum)) {
				metadata.userId = userIdNum
			}
		}
		if (latitude) {
			metadata.latitude = parseFloat(latitude)
		}
		if (longitude) {
			metadata.longitude = parseFloat(longitude)
		}

		if (Object.keys(metadata).length > 0) {
			tokenOptions.metadata = JSON.stringify(metadata)

			// Log the participant metadata being sent
			console.log('🏷️ Participant metadata being sent:', metadata)
			console.log('📝 Stringified metadata:', tokenOptions.metadata)
		} else {
			console.log('⚠️ No participant metadata to add to token')
		}

		// Log room and organization information
		console.log('🏠 Room created with organization prefix:', {
			orgId: orgId || 'default',
			roomName: roomName,
			identity: identity,
			note: 'Room name includes org_id prefix for organization isolation'
		})

		const token = await createToken(tokenOptions, grant)
		const result: TokenResult = {
			identity,
			accessToken: token,
			url: process.env.LIVEKIT_WS_URL
		}

		res.status(200).json(result)
	} catch (e) {
		console.error('❌ Token generation error:', e)
		return res.status(500).json({
			error: 'Failed to generate token',
			message: (e as Error).message
		})
	}
}

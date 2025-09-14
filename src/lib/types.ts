import {LocalAudioTrack, LocalVideoTrack} from 'livekit-client'

export interface SessionProps {
	roomName: string
	identity: string
	audioTrack?: LocalAudioTrack
	videoTrack?: LocalVideoTrack
	region?: string
	turnServer?: RTCIceServer
	forceRelay?: boolean
}

export interface TokenResult {
	identity: string
	accessToken: string
	url?: string
}

// Core data model interfaces
export interface Experiment {
	id: number
	experiment_id: number
	title: string
	protocol: string
	user_id: number
	user_name?: string
	created_at: string
	save_location?: string
	name?: string
	description?: string
	org_id?: string // Added for multi-tenant support
}

export interface Session {
	id: number
	session_uuid: string
	experiment_id: number
	created_at: string
}

export interface ExperimentLog {
	id: number
	experiment_id: number
	session_id: number
	speaker: string
	content: string
	assistant_active: boolean | null
	timestamp: string
}

// API Response types
export interface ApiResponse<T> {
	success?: boolean
	data?: T
	error?: string
	message?: string
}

export interface ExperimentsResponse {
	experiments: Experiment[]
}

// LiveKit metadata interface
export interface LiveKitMetadata {
	experimentId?: number
	userId?: number
	latitude?: number
	longitude?: number
	accessToken?: string
	org_id?: string
}

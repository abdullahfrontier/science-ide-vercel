'use client'

import React, {createContext, useState} from 'react'
import {useCallback} from 'react'
import {useConfig} from './useConfig'
import {useToast} from '@/components/toast/ToasterProvider'
import {useSelector} from 'react-redux'
import type {RootState} from '@/store'
import {doGetSessionToken} from '@/api/index'

type TokenGeneratorData = {
	shouldConnect: boolean
	wsUrl: string
	token: string
	disconnect: () => Promise<void>
	connect: () => Promise<void>
}

const ConnectionContext = createContext<TokenGeneratorData | undefined>(undefined)

export const ConnectionProvider = ({children}: {children: React.ReactNode}) => {
	const {idToken, user, currentOrganization, currentExperimentId, latitude, longitude} = useSelector((state: RootState) => state.auth)
	const {setToastMessage} = useToast()
	const {config} = useConfig()

	const [connectionDetails, setConnectionDetails] = useState<{
		wsUrl: string
		token: string
		shouldConnect: boolean
	}>({wsUrl: '', token: '', shouldConnect: false})

	const connect = useCallback(async () => {
		let token = ''
		let url = ''
		const params = new URLSearchParams()
		if (config.settings.room_name) {
			params.append('roomName', config.settings.room_name)
		}
		if (config.settings.participant_name) {
			params.append('participantName', config.settings.participant_name)
		}

		const orgId = currentOrganization?.org_id

		console.log('🔍 Token request - experimentId:', currentExperimentId)
		console.log('🔍 Token request - experimentId from URL:', new URLSearchParams(window.location.search).get('experiment_id'))
		console.log('🔍 Token request - final currentExperimentId:', currentExperimentId)
		console.log('🔍 Token request - orgId:', orgId)
		console.log('🔍 Token request - user id:', user?.identities[0]?.userId)
		console.log('🔍 Token request - location:', {latitude, longitude})

		// Validate that we have an experiment ID before connecting
		if (!currentExperimentId) {
			console.error('❌ No experiment ID found - cannot connect to LiveKit')
			setToastMessage({
				type: 'error',
				message: 'Please select an experiment before connecting to the assistant.'
			})
			throw new Error('No experiment selected')
		}

		// Experiment IDs are now strings (nanoid format)
		if (currentExperimentId) {
			params.append('experimentId', currentExperimentId)
		}
		if (user?.identities[0]?.userId) {
			params.append('userId', user?.identities[0]?.userId.toString())
		}
		if (latitude) {
			params.append('latitude', latitude)
		}
		if (longitude) {
			params.append('longitude', longitude)
		}
		if (orgId) {
			params.append('orgId', orgId)
		}
		if (idToken) {
			params.append('accessToken', idToken)
		}
		if (user?.email) {
			params.append('userEmail', user.email)
			console.log('📧 Adding user email to token request:', user.email)
		}

		const response = await doGetSessionToken({params: params})

		token = response.accessToken
		if (response.url) {
			url = response.url
		}
		try {
			const tokenPayload = JSON.parse(atob(token.split('.')[1]))
			console.log('🏷️ Token payload metadata:', tokenPayload.metadata)
			if (tokenPayload.metadata) {
				const metadata = JSON.parse(tokenPayload.metadata)
				console.log('🏷️ Parsed metadata:', metadata)
			}
		} catch (e) {
			console.log('⚠️ Could not parse token metadata:', e)
		}
		setConnectionDetails({wsUrl: url, token, shouldConnect: true})
	}, [config.settings.token, config.settings.ws_url, config.settings.room_name, config.settings.participant_name, setToastMessage])

	const disconnect = useCallback(async () => {
		setConnectionDetails((prev) => ({...prev, shouldConnect: false}))
	}, [])

	return (
		<ConnectionContext.Provider
			value={{
				wsUrl: connectionDetails.wsUrl,
				token: connectionDetails.token,
				shouldConnect: connectionDetails.shouldConnect,
				connect,
				disconnect
			}}>
			{children}
		</ConnectionContext.Provider>
	)
}

export const useConnection = () => {
	const context = React.useContext(ConnectionContext)
	if (context === undefined) {
		throw new Error('useConnection must be used within a ConnectionProvider')
	}
	return context
}

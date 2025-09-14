import {apiClient} from '@/api/client'

export async function doRegisterExperiment({title, protocol, orgId}: {title: string; protocol: string; orgId: string}) {
	if (!orgId) {
		throw new Error('Organization is required')
	}
	if (!title || !protocol) {
		throw new Error('Please fill in all fields')
	}
	return await apiClient.postToNextJS('/api/register-experiment', {
		title: title.trim(),
		protocol: protocol.trim(),
		orgId
	})
}

export async function doUpdateExperiment({title, experimentId, orgId}: {title: string; experimentId: string; orgId: string}) {
	if (!orgId) {
		throw new Error('Organization is required')
	}
	if (!title || !experimentId) {
		throw new Error('Please fill in all fields')
	}
	return await apiClient.putToNextJS('/api/update-experiment', {
		experimentId: experimentId,
		title: title,
		orgId: orgId
	})
}

export async function doUpdateExperimentProtocol({protocol, experimentId, orgId}: {protocol: string; experimentId: string; orgId: string}) {
	if (!orgId) {
		throw new Error('Organization is required')
	}
	if (!protocol || !experimentId) {
		throw new Error('Please fill in all fields')
	}
	return await apiClient.putToNextJS('/api/update-experiment-protocol', {
		experimentId: experimentId,
		protocol: protocol,
		orgId: orgId
	})
}

export async function doAddUserToOrganization({email, orgId}: {email: string; orgId: string}) {
	if (!orgId) {
		throw new Error('Organization is required')
	}
	if (!email) {
		throw new Error('Email is required')
	}
	return await apiClient.postToNextJS('/api/add-user-to-organization', {
		orgId: orgId,
		email: email
	})
}

export async function doCreateSession({requestData}: {requestData: any}) {
	return await apiClient.postToNextJS('/api/create-session', {
		requestData: requestData
	})
}

export async function doCreateOrganization({name}: {name: string}) {
	if (!name) {
		throw new Error('Name is required')
	}
	return await await apiClient.postToNextJS('/api/create-organization', {
		name: name
	})
}

export async function doGenerateELN({experimentId, send_email, orgId}: {experimentId: string; send_email: boolean; orgId: string}) {
	if (!experimentId) {
		throw new Error('Experiment is required')
	}
	if (!orgId) {
		throw new Error('Organization is required')
	}
	return await apiClient.postToNextJS(
		'/api/generate-eln',
		{
			experimentId: experimentId,
			send_email: send_email,
			orgId: orgId
		},
		false,
		true
	)
}

export async function doUpdateUser({email, name}: {email: string; name: string}) {
	return await apiClient.putToNextJS('/api/update-user', {
		email: email,
		name: name
	})
}

export async function doLoadExperiment({experimentId, orgId}: {experimentId: string; orgId: string}) {
	if (!orgId) {
		throw new Error('Organization is required')
	}
	if (!experimentId) {
		throw new Error('Experiment id is required')
	}
	return await apiClient.getFromNextJS(`/api/load-experiment?experimentId=${experimentId}&org_id=${orgId}`)
}

export async function doGetExperiments({orgId}: {orgId: string}) {
	if (!orgId) {
		throw new Error('Organization is required')
	}
	return await apiClient.getFromNextJS(`/api/get-experiments?org_id=${orgId}`)
}

export async function doGetSessionSummary({experimentId, params}: {experimentId: string; params: any}) {
	if (!experimentId) {
		throw new Error('Experiment id is required')
	}
	return await apiClient.getFromNextJS(`/api/get-session-summary?experimentId=${experimentId}&${params.toString()}`)
}

export async function doGetLabFeed({orgId}: {orgId: string}) {
	if (!orgId) {
		throw new Error('Experiment id is required')
	}
	const params = new URLSearchParams({
		org_id: orgId,
		limit: '10', // Default limit
		max_experiments: '20' // Default max experiments
	})
	return await apiClient.getFromNextJS(`/api/get-lab-feed?${params.toString()}`)
}

export async function doGetUserOrganizations({email}: {email: string}) {
	if (!email) {
		throw new Error('Email id is required')
	}
	return await apiClient.getFromNextJS(`/api/get-user-organizations?email=${email}`)
}

export async function doGetSessionToken({params}: {params: any}) {
	return await apiClient.getFromNextJS(`/api/session-token?${params}`)
}

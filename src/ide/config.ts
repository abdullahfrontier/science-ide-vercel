export const aiModel = 'gpt-4o-mini' as const

// AI Provider configuration
export const AI_PROVIDER = process.env.AI_PROVIDER || 'openai'
export const LOCAL_AI_ENDPOINT = process.env.LOCAL_AI_ENDPOINT || '/api/autocomplete'
export const OPENAI_API_KEY = process.env.OPENAI_API_KEY

// Log configuration on startup
console.log('AI Configuration:', {
	OPENAI_API_KEY: OPENAI_API_KEY,
	provider: AI_PROVIDER,
	endpoint: AI_PROVIDER === 'local' ? LOCAL_AI_ENDPOINT : 'OpenAI API'
})

export function getRoomId(pageId: string) {
	return `liveblocks:examples:${pageId}`
}

export function getPageId(roomId: string) {
	return roomId.split(':')[2]
}

export function getPageUrl(roomId: string) {
	return `/${getPageId(roomId)}`
}

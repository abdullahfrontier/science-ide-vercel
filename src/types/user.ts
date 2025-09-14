export interface Identity {
	userId: string
	provider?: string
}

export interface User {
	id: number
	aud: string
	name: string
	email: string
	created_at: string
	updated_at: string
	identities: Identity[]
}

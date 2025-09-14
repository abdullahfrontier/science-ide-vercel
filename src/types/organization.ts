/**
 * Organization-related type definitions for multi-tenant support
 */

export interface Organization {
	org_id: string
	name: string
	created_at: string
	updated_at: string
}

export interface UserOrganizationsResponse {
	organizations: Organization[]
	next_key?: string | null
}

export interface CreateOrganizationRequest {
	name: string
}

export interface CreateOrganizationResponse {
	message: string
	organization?: Organization
}

export interface OrganizationContextValue {
	currentOrganization: Organization | null
	organizations: Organization[]
	isLoading: boolean
	error: string | null
	setCurrentOrganization: (org: Organization) => void
	refreshOrganizations: () => Promise<void>
	createOrganization: (name: string) => Promise<Organization>
	clearOrganization: () => void
}

export type OrganizationSelectionResult = {type: 'selected'; organization: Organization} | {type: 'created'; organization: Organization} | {type: 'cancelled'}

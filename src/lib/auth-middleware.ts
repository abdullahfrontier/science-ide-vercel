import {NextApiRequest, NextApiResponse} from 'next'

export interface AuthenticatedRequest extends NextApiRequest {
	token: string
}

export type AuthenticatedHandler = (req: AuthenticatedRequest, res: NextApiResponse) => Promise<void> | void

/**
 * JWT authentication middleware for Next.js API routes
 * Extracts and validates JWT token from Authorization header
 */
export function withAuth(handler: AuthenticatedHandler) {
	return async (req: NextApiRequest, res: NextApiResponse) => {
		// Extract JWT token from Authorization header
		const authHeader = req.headers.authorization
		if (!authHeader || !authHeader.startsWith('Bearer ')) {
			return res.status(401).json({error: 'Authorization token required'})
		}

		const token = authHeader.substring(7) // Remove 'Bearer ' prefix

		// Add token to request object
		;(req as AuthenticatedRequest).token = token

		// Call the original handler with authenticated request
		return handler(req as AuthenticatedRequest, res)
	}
}

/**
 * Helper function to get base URL for backend API calls
 */
export function getBaseUrl(): string {
	return process.env.API_BASE_URL || 'http://localhost:3002'
}

/**
 * Helper function to create authenticated fetch headers
 */
export function createAuthHeaders(token: string): Record<string, string> {
	return {
		'Content-Type': 'application/json',
		Authorization: `Bearer ${token}`
	}
}

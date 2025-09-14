import {NextApiRequest, NextApiResponse} from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	if (req.method !== 'POST') {
		return res.status(405).json({error: 'Method not allowed'})
	}

	const {email, password} = req.body

	if (!email || !password) {
		return res.status(400).json({error: 'Email and password are required'})
	}

	try {
		// Call the FastAPI backend
		const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3002'
		const response = await fetch(`${baseUrl}/auth/login`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({email, password})
		})

		const data = await response.json()

		if (response.ok) {
			return res.status(200).json(data)
		} else {
			return res.status(response.status).json(data)
		}
	} catch (error) {
		console.error('Auth error:', error)
		return res.status(500).json({
			authenticated: false,
			message: 'Failed to connect to authentication server'
		})
	}
}

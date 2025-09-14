import {useSelector} from 'react-redux'
import type {RootState} from '@/store'

//not being used
export const useAuthHeaders = () => {
	const idToken = useSelector((state: RootState) => state.auth.idToken)

	const getAuthHeaders = (): Record<string, string> => {
		const headers: Record<string, string> = {
			'Content-Type': 'application/json'
		}

		if (idToken) {
			headers['Authorization'] = `Bearer ${idToken}`
		}

		return headers
	}

	return {getAuthHeaders}
}

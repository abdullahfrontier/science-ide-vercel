import {createAsyncThunk} from '@reduxjs/toolkit'
import {User} from '@/types/user'
import type {RootState} from '@/store'
// import {apiClient} from '@/api/client'

export interface AuthPayload {
	user: User
	refreshToken: string | null
	idToken: string
}

export const login = createAsyncThunk<AuthPayload, AuthPayload, {rejectValue: string}>('auth/login', async (data, {rejectWithValue}) => {
	try {
		// const response = await fetch('/api/login', {
		// 	method: 'POST',
		// 	headers: {'Content-Type': 'application/json'},
		// 	body: JSON.stringify({email, password})
		// })
		// const data = await response.json()

		// if (!response.ok) {
		// 	return rejectWithValue(data?.message || 'Login failed')
		// }

		// if (!data?.authenticated || !data?.access_token || !data?.user) {
		// 	return rejectWithValue(data?.message || 'Invalid login response')
		// }

		console.log(data.user)
		// apiClient.setAccessToken(data.idToken)

		return {
			user: data.user as User,
			refreshToken: data.refreshToken || null,
			idToken: data.idToken
		}
	} catch (err: any) {
		return rejectWithValue(err?.message || 'Login failed')
	}
})

export const refreshAccessToken = createAsyncThunk<{accessToken: string; refreshToken?: string | null}, void, {rejectValue: string; state: RootState}>('auth/refreshAccessToken', async (_, {rejectWithValue, getState}) => {
	try {
		const state = getState()
		const refreshToken = state.auth.refreshToken
		console.log('Refreshing access token with refresh token:', refreshToken)

		if (!refreshToken) {
			return rejectWithValue('No refresh token')
		}

		const response = await fetch('/api/refresh', {
			method: 'POST',
			headers: {'Content-Type': 'application/json'},
			body: JSON.stringify({refresh_token: refreshToken})
		})

		const data = await response.json()
		if (!response.ok) {
			return rejectWithValue(data?.message || 'Refresh failed')
		}

		if (!data?.access_token) {
			return rejectWithValue('No access token in response')
		}

		// apiClient.setAccessToken(data.idToken)

		return {
			accessToken: data.access_token,
			refreshToken: data.refresh_token || null,
			idToken: data.id_token || null
		}
	} catch (err: any) {
		return rejectWithValue(err?.message || 'Refresh failed')
	}
})

export const logout = createAsyncThunk('auth/logout', async () => {
	console.log('User logged out and local storage cleared')
})

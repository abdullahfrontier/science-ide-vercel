import {createSlice, PayloadAction} from '@reduxjs/toolkit'
import {User} from '@/types/user'
import {login, logout, refreshAccessToken} from '@/store/thunks/authThunk'
import {Organization} from '@/types/organization'

export interface AuthState {
	user: User | null
	refreshToken: string | null
	idToken: string | null
	isAuthenticated: boolean
	loading: boolean
	error: string | null
	currentOrganization?: Organization | null
	orginizations?: Organization[]
	currentExperimentId: string | null
	latitude: string | null
	longitude: string | null
}

const initialState: AuthState = {
	user: null,
	idToken: null,
	refreshToken: null,
	isAuthenticated: true,
	loading: false,
	error: null,
	currentOrganization: null,
	orginizations: [],
	currentExperimentId: null,
	latitude: null,
	longitude: null
}

const authSlice = createSlice({
	name: 'auth',
	initialState,
	reducers: {
		updateUser(state, action: PayloadAction<User | null>) {
			state.user = action.payload
		},
		updateTokens(state, action: PayloadAction<string | null>) {
			state.idToken = action.payload
		},
		updatecurrentExperimentId(state, action: PayloadAction<string | null>) {
			state.currentExperimentId = action.payload
		},
		updateOrganizations(state, action: PayloadAction<Organization[]>) {
			state.orginizations = action.payload
		},
		updateCurrentOrganization(state, action: PayloadAction<Organization | null>) {
			state.currentOrganization = action.payload
		},
		updateLocation(state, action: PayloadAction<{latitude: string | null; longitude: string | null}>) {
			state.latitude = action.payload.latitude
			state.longitude = action.payload.longitude
		}
	},
	extraReducers: (builder) => {
		// LOGIN
		builder
			.addCase(login.pending, (state) => {
				state.loading = true
				state.error = null
			})
			.addCase(login.fulfilled, (state, action: PayloadAction<{user: User; refreshToken: string | null; idToken: string | null}>) => {
				state.loading = false
				state.user = action.payload.user
				state.idToken = action.payload.idToken
				state.refreshToken = action.payload.refreshToken
				state.isAuthenticated = true
			})
			.addCase(login.rejected, (state, action) => {
				state.loading = false
				state.error = action.payload || 'Login failed'
				state.isAuthenticated = true
			})

		// REFRESH TOKEN
		builder.addCase(refreshAccessToken.fulfilled, (state, action: PayloadAction<{accessToken: string; refreshToken?: string | null; idToken?: string | null}>) => {
			state.refreshToken = action.payload.refreshToken || null
			state.idToken = action.payload.idToken || null
			state.isAuthenticated = true
		})

		// LOGOUT
		builder.addCase(logout.fulfilled, (state) => {
			state.user = null
			state.idToken = null
			state.refreshToken = null
			state.isAuthenticated = true
			state.loading = false
		})
	}
})

export const {updateUser, updateTokens, updateOrganizations, updateCurrentOrganization, updatecurrentExperimentId, updateLocation} = authSlice.actions
export default authSlice.reducer

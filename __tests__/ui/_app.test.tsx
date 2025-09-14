import React, {ReactNode} from 'react'
import {render, screen} from '@testing-library/react'
import {Provider} from 'react-redux'
import {configureStore} from '@reduxjs/toolkit'
import authReducer, {AuthState} from '@/store/slices/authSlice'
import LoginPage from '@/pages/login'

jest.mock('next/router', () => ({
	useRouter: () => ({
		pathname: '/login',
		replace: jest.fn()
	})
}))

interface RootState {
	auth: AuthState
}

const createMockAuthState = (overrides?: Partial<AuthState>): AuthState => ({
	user: null,
	idToken: null,
	refreshToken: null,
	isAuthenticated: false,
	loading: false,
	error: null,
	currentOrganization: null,
	orginizations: [],
	currentExperimentId: null,
	latitude: null,
	longitude: null,
	...overrides
})

function renderWithStore(ui: ReactNode, preloadedState?: RootState) {
	const store = configureStore({
		reducer: {
			auth: authReducer
		},
		preloadedState
	})
	return render(<Provider store={store}>{ui}</Provider>)
}

describe('LoginPage', () => {
	it('renders login page', () => {
		renderWithStore(<LoginPage />, {auth: createMockAuthState()})

		// expect(screen.getByText(/login/i)).toBeInTheDocument()
	})

	it('renders loader when authLoading is true', () => {
		renderWithStore(<LoginPage />, {
			auth: createMockAuthState({loading: true})
		})

		expect(screen.getByTestId('full-page-loader')).toBeInTheDocument()
	})
})

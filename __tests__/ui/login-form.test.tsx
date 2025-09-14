import React from 'react'
import {render, screen} from '@testing-library/react'
import {Provider} from 'react-redux'
import configureMockStore, {MockStoreEnhanced} from 'redux-mock-store'
import {AnyAction} from 'redux'
import {LoginForm} from '@/components/auth/LoginForm'
import {AuthState} from '@/store/slices/authSlice'

interface RootState {
	auth: AuthState
}

type Store = MockStoreEnhanced<RootState, AnyAction>
const mockStore = configureMockStore<RootState, AnyAction>([])

describe('LoginForm', () => {
	it('renders loader when authLoading is true', () => {
		const store: Store = mockStore({
			auth: {
				user: null,
				idToken: null,
				refreshToken: null,
				isAuthenticated: false,
				loading: true,
				error: null,
				currentOrganization: null,
				orginizations: [],
				currentExperimentId: null,
				latitude: null,
				longitude: null
			}
		})

		render(
			<Provider store={store}>
				<LoginForm />
			</Provider>
		)

		expect(screen.getByTestId('full-page-loader')).toBeInTheDocument()
	})

	it('renders nothing when user is authenticated', () => {
		const store: Store = mockStore({
			auth: {
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
		})

		const {container} = render(
			<Provider store={store}>
				<LoginForm />
			</Provider>
		)

		expect(container).toBeEmptyDOMElement()
	})

	it('renders login form when unauthenticated', () => {
		const store: Store = mockStore({
			auth: {
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
				longitude: null
			}
		})

		render(
			<Provider store={store}>
				<LoginForm />
			</Provider>
		)

		expect(screen.getByText(/Eureka Lab Assistant/i)).toBeInTheDocument()
		expect(screen.getByText(/Sign in to access your experiments/i)).toBeInTheDocument()
		expect(screen.getByRole('button', {name: /sign in with google/i})).toBeInTheDocument()
		expect(screen.getByText(/By signing in, you agree to our Terms of Service and Privacy Policy/i)).toBeInTheDocument()
	})
})

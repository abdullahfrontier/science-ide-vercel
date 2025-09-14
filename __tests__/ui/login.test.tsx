import {render, screen, fireEvent} from '@testing-library/react'
import {Provider} from 'react-redux'
import configureMockStore, {MockStoreEnhanced} from 'redux-mock-store'
import {AnyAction} from 'redux'
import {LoginForm} from '@/components/auth/LoginForm'
import {AuthState} from '@/store/slices/authSlice'
import {cognitoAuth} from '@/lib/cognito-auth'

jest.mock('@/lib/cognito-auth', () => ({
	cognitoAuth: {loginWithGoogle: jest.fn()}
}))

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

	it('renders nothing when already authenticated', () => {
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

	it('renders login UI when unauthenticated', () => {
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

		expect(screen.getByText(/Eureka Lab Assistant/)).toBeInTheDocument()
		expect(screen.getByRole('button', {name: /sign in with google/i})).toBeInTheDocument()
	})

	it('calls cognitoAuth.loginWithGoogle when button clicked', () => {
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

		fireEvent.click(screen.getByRole('button', {name: /sign in with google/i}))
		expect(cognitoAuth.loginWithGoogle).toHaveBeenCalled()
	})
})

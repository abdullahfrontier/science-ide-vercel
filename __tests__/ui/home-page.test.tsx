import React from 'react'
import {render, screen} from '@testing-library/react'
import {Provider} from 'react-redux'
import configureMockStore, {MockStoreEnhanced} from 'redux-mock-store'
import {AnyAction} from 'redux'
import HomePage from '@/pages/index'
import {AuthState} from '@/store/slices/authSlice'

jest.mock('@/components/layouts/MainLayout', () => () => <div>MainLayout</div>)
jest.mock('@/components/common/FullPageLoader', () => ({
	FullPageLoader: () => <div data-testid="loader">Loading...</div>
}))

interface RootState {
	auth: AuthState
}

type Store = MockStoreEnhanced<RootState, AnyAction>
const mockStore = configureMockStore<RootState, AnyAction>([])

describe('HomePage', () => {
	it('renders loader when auth is loading', () => {
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
				<HomePage />
			</Provider>
		)
		expect(screen.getByTestId('loader')).toBeInTheDocument()
	})

	it('renders MainLayout when authenticated', () => {
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

		render(
			<Provider store={store}>
				<HomePage />
			</Provider>
		)
		expect(screen.getByText(/MainLayout/)).toBeInTheDocument()
	})

	it('renders nothing when not authenticated and not loading', () => {
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

		const {container} = render(
			<Provider store={store}>
				<HomePage />
			</Provider>
		)
		expect(container).toBeEmptyDOMElement()
	})
})

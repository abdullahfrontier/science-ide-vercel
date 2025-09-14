import React from 'react'
import {Provider} from 'react-redux'
import configureMockStore from 'redux-mock-store'
import {render, screen, waitFor} from '@testing-library/react'
import '@testing-library/jest-dom'
import SelectOrganization from '../../src/pages/select-organization'
import {Organization} from '@/types/organization'

const mockPush = jest.fn()
const mockRouter = {
	push: mockPush,
	pathname: '/select-organization',
	query: {},
	asPath: '/select-organization'
}

jest.mock('next/router', () => ({
	useRouter: () => mockRouter
}))

jest.mock('../../src/api', () => ({
	doGetUserOrganizations: jest.fn(),
	doCreateOrganization: jest.fn()
}))

jest.mock('../../src/components/common/FullPageLoader', () => ({
	FullPageLoader: ({message}: {message: string}) => <div data-testid="loader">{message}</div>
}))

const mockStore = configureMockStore()

const {doGetUserOrganizations, doCreateOrganization} = require('../../src/api')

const createMockOrg = (overrides?: Partial<Organization>): Organization => ({
	org_id: '1',
	name: 'Default Org',
	created_at: '2023-01-01T00:00:00Z',
	updated_at: '2023-01-01T00:00:00Z',
	...overrides
})

describe('SelectOrganization', () => {
	let store: ReturnType<typeof mockStore>

	beforeEach(() => {
		jest.clearAllMocks()
		mockPush.mockClear()
		;(doGetUserOrganizations as jest.Mock).mockResolvedValue({
			organizations: []
		})

		store = mockStore({
			auth: {
				user: {email: 'test@example.com'},
				orginizations: [],
				currentOrganization: null
			}
		})
	})

	it('shows loader while fetching organizations', async () => {
		;(doGetUserOrganizations as jest.Mock).mockImplementation(() => new Promise((resolve) => setTimeout(() => resolve({organizations: []}), 100)))

		render(
			<Provider store={store}>
				<SelectOrganization />
			</Provider>
		)

		expect(screen.getByTestId('loader')).toBeInTheDocument()
		expect(screen.getByText('Loading organizations...')).toBeInTheDocument()
	})

	it('renders create org form when no orgs', async () => {
		;(doGetUserOrganizations as jest.Mock).mockResolvedValue({
			organizations: []
		})

		render(
			<Provider store={store}>
				<SelectOrganization />
			</Provider>
		)

		await waitFor(() => {
			expect(screen.getByText(/Create Your Organization/i)).toBeInTheDocument()
		})

		expect(screen.getByText('You need to create an organization to get started')).toBeInTheDocument()
		expect(screen.getByPlaceholderText('Enter organization name')).toBeInTheDocument()
	})

	it('renders org list when multiple orgs exist', async () => {
		const mockOrganizations = [createMockOrg({org_id: '1', name: 'Org One'}), createMockOrg({org_id: '2', name: 'Org Two'})]

		;(doGetUserOrganizations as jest.Mock).mockResolvedValue({
			organizations: mockOrganizations
		})

		render(
			<Provider store={store}>
				<SelectOrganization />
			</Provider>
		)

		await waitFor(() => {
			expect(screen.getByText('Select Organization')).toBeInTheDocument()
		})

		expect(screen.getByText('Org One')).toBeInTheDocument()
		expect(screen.getByText('Org Two')).toBeInTheDocument()
		expect(screen.getByText('Create New Organization')).toBeInTheDocument()
	})

	it('automatically selects organization when only one exists', async () => {
		const singleOrg = createMockOrg({org_id: '1', name: 'Single Org'})

		;(doGetUserOrganizations as jest.Mock).mockResolvedValue({
			organizations: [singleOrg]
		})

		render(
			<Provider store={store}>
				<SelectOrganization />
			</Provider>
		)

		await waitFor(() => {
			expect(screen.getByText('Setting up workspace...')).toBeInTheDocument()
		})

		const actions = store.getActions()
		expect(actions).toContainEqual(
			expect.objectContaining({
				type: expect.stringContaining('updateCurrentOrganization')
			})
		)
	})

	it('handles API error gracefully', async () => {
		;(doGetUserOrganizations as jest.Mock).mockRejectedValue(new Error('API Error'))

		render(
			<Provider store={store}>
				<SelectOrganization />
			</Provider>
		)

		await waitFor(() => {
			expect(screen.getByText('Failed to load organizations')).toBeInTheDocument()
		})
	})
})

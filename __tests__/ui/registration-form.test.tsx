import React from 'react'
import {render, screen, fireEvent, waitFor} from '@testing-library/react'
import '@testing-library/jest-dom'
import {Provider} from 'react-redux'
import configureStore from 'redux-mock-store'
import RegistrationForm from '@/components/auth/RegistrationForm'
import {doAddUserToOrganization} from '@/api'
import {Organization} from '@/types/organization'

const mockOrganization = (overrides?: Partial<Organization>): Organization => ({
	org_id: 'org123',
	name: 'Test Org',
	created_at: new Date().toISOString(),
	updated_at: new Date().toISOString(),
	...overrides
})

jest.mock('@/api', () => ({
	doAddUserToOrganization: jest.fn()
}))

const mockStore = configureStore([])

describe('RegistrationForm', () => {
	let store: ReturnType<typeof mockStore>

	beforeEach(() => {
		store = mockStore({
			auth: {
				currentOrganization: mockOrganization()
			}
		})
		;(doAddUserToOrganization as jest.Mock).mockResolvedValue({})
	})

	const renderWithStore = (onUserRegistered?: () => void) =>
		render(
			<Provider store={store}>
				<RegistrationForm onUserRegistered={onUserRegistered} />
			</Provider>
		)

	it('renders form fields and info card', () => {
		renderWithStore()
		expect(screen.getByRole('heading', {name: /Add User to Organization/i})).toBeInTheDocument()
		expect(screen.getByLabelText(/Email Address/i)).toBeInTheDocument()
		expect(screen.getByText(/User Addition Information/i)).toBeInTheDocument()
	})

	it('validates required email', async () => {
		renderWithStore()
		const submitButton = screen.getByRole('button', {name: /Add User to Organization/i})
		fireEvent.click(submitButton)

		expect(await screen.findByText(/Please enter your email address/i)).toBeInTheDocument()
	})

	it('submits with correct payload', async () => {
		renderWithStore()

		fireEvent.change(screen.getByLabelText(/Email Address/i), {
			target: {value: 'test@example.com'}
		})

		const submitButton = screen.getByRole('button', {name: /Add User to Organization/i})
		fireEvent.click(submitButton)

		await waitFor(() => {
			expect(doAddUserToOrganization).toHaveBeenCalledWith({
				email: 'test@example.com',
				orgId: 'org123'
			})
		})
	})

	it('resets after clicking "Add Another User"', async () => {
		renderWithStore()

		fireEvent.change(screen.getByLabelText(/Email Address/i), {
			target: {value: 'test@example.com'}
		})
		const submitButton = screen.getByRole('button', {name: /Add User to Organization/i})
		fireEvent.click(submitButton)

		await screen.findByText(/successfully added/i)

		fireEvent.click(screen.getByRole('button', {name: /Add Another User/i}))

		await waitFor(() => expect(screen.getByLabelText(/Email Address/i)).toHaveValue(''))
	})
})

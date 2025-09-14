import * as apiFunctions from '@/api'
import {apiClient} from '@/api/client'

jest.mock('@/api/client', () => ({
	apiClient: {
		postToNextJS: jest.fn(),
		getFromNextJS: jest.fn(),
		putToNextJS: jest.fn()
	}
}))

type MockedApiClient = {
	postToNextJS: jest.Mock
	getFromNextJS: jest.Mock
	putToNextJS: jest.Mock
}

describe('API Functions', () => {
	const mockApiClient = apiClient as unknown as MockedApiClient

	beforeEach(() => {
		jest.clearAllMocks()
	})

	describe('doRegisterExperiment', () => {
		const validParams = {
			title: 'Test Experiment',
			protocol: 'Test Protocol',
			orgId: 'org-123'
		}

		it('should register experiment successfully', async () => {
			const mockResponse = {id: 'exp-123', success: true}
			mockApiClient.postToNextJS.mockResolvedValue(mockResponse)

			const result = await apiFunctions.doRegisterExperiment(validParams)

			expect(mockApiClient.postToNextJS).toHaveBeenCalledWith('/api/register-experiment', validParams)
			expect(result).toEqual(mockResponse)
		})

		it('should trim whitespace from title and protocol', async () => {
			const mockResponse = {id: 'exp-123', success: true}
			mockApiClient.postToNextJS.mockResolvedValue(mockResponse)

			await apiFunctions.doRegisterExperiment({
				title: '  Test Experiment  ',
				protocol: '  Test Protocol  ',
				orgId: 'org-123'
			})

			expect(mockApiClient.postToNextJS).toHaveBeenCalledWith('/api/register-experiment', {
				title: 'Test Experiment',
				protocol: 'Test Protocol',
				orgId: 'org-123'
			})
		})

		it('should throw error when orgId is missing', async () => {
			await expect(
				apiFunctions.doRegisterExperiment({
					title: 'Test',
					protocol: 'Test',
					orgId: ''
				})
			).rejects.toThrow('Organization is required')
		})

		it('should throw error when title is missing', async () => {
			await expect(
				apiFunctions.doRegisterExperiment({
					title: '',
					protocol: 'Test',
					orgId: 'org-123'
				})
			).rejects.toThrow('Please fill in all fields')
		})

		it('should throw error when protocol is missing', async () => {
			await expect(
				apiFunctions.doRegisterExperiment({
					title: 'Test',
					protocol: '',
					orgId: 'org-123'
				})
			).rejects.toThrow('Please fill in all fields')
		})
	})

	describe('doUpdateExperiment', () => {
		const validParams = {
			title: 'Updated Experiment',
			experimentId: 'exp-123',
			orgId: 'org-123'
		}

		it('should update experiment successfully', async () => {
			const mockResponse = {success: true}
			mockApiClient.putToNextJS.mockResolvedValue(mockResponse)

			const result = await apiFunctions.doUpdateExperiment(validParams)

			expect(mockApiClient.putToNextJS).toHaveBeenCalledWith('/api/update-experiment', validParams)
			expect(result).toEqual(mockResponse)
		})

		it('should throw error when orgId is missing', async () => {
			await expect(apiFunctions.doUpdateExperiment({...validParams, orgId: ''})).rejects.toThrow('Organization is required')
		})

		it('should throw error when title is missing', async () => {
			await expect(apiFunctions.doUpdateExperiment({...validParams, title: ''})).rejects.toThrow('Please fill in all fields')
		})

		it('should throw error when experimentId is missing', async () => {
			await expect(apiFunctions.doUpdateExperiment({...validParams, experimentId: ''})).rejects.toThrow('Please fill in all fields')
		})
	})

	describe('doUpdateExperimentProtocol', () => {
		const validParams = {
			protocol: 'Updated Protocol',
			experimentId: 'exp-123',
			orgId: 'org-123'
		}

		it('should update experiment protocol successfully', async () => {
			const mockResponse = {success: true}
			mockApiClient.putToNextJS.mockResolvedValue(mockResponse)

			const result = await apiFunctions.doUpdateExperimentProtocol(validParams)

			expect(mockApiClient.putToNextJS).toHaveBeenCalledWith('/api/update-experiment-protocol', validParams)
			expect(result).toEqual(mockResponse)
		})

		it('should validate required fields', async () => {
			await expect(apiFunctions.doUpdateExperimentProtocol({...validParams, orgId: ''})).rejects.toThrow('Organization is required')

			await expect(apiFunctions.doUpdateExperimentProtocol({...validParams, protocol: ''})).rejects.toThrow('Please fill in all fields')
		})
	})

	describe('doAddUserToOrganization', () => {
		const validParams = {email: 'test@example.com', orgId: 'org-123'}

		it('should add user to organization successfully', async () => {
			const mockResponse = {success: true}
			mockApiClient.postToNextJS.mockResolvedValue(mockResponse)

			const result = await apiFunctions.doAddUserToOrganization(validParams)

			expect(mockApiClient.postToNextJS).toHaveBeenCalledWith('/api/add-user-to-organization', validParams)
			expect(result).toEqual(mockResponse)
		})

		it('should validate email and orgId', async () => {
			await expect(apiFunctions.doAddUserToOrganization({email: '', orgId: 'org-123'})).rejects.toThrow('Email is required')

			await expect(apiFunctions.doAddUserToOrganization({email: 'test@example.com', orgId: ''})).rejects.toThrow('Organization is required')
		})
	})

	describe('doCreateSession', () => {
		it('should create session successfully', async () => {
			const requestData = {type: 'experiment', id: 'exp-123'}
			const mockResponse = {sessionId: 'session-123'}
			mockApiClient.postToNextJS.mockResolvedValue(mockResponse)

			const result = await apiFunctions.doCreateSession({requestData})

			expect(mockApiClient.postToNextJS).toHaveBeenCalledWith('/api/create-session', {requestData})
			expect(result).toEqual(mockResponse)
		})
	})

	describe('doCreateOrganization', () => {
		it('should create organization successfully', async () => {
			const mockResponse = {id: 'org-123', name: 'Test Org'}
			mockApiClient.postToNextJS.mockResolvedValue(mockResponse)

			const result = await apiFunctions.doCreateOrganization({name: 'Test Org'})

			expect(mockApiClient.postToNextJS).toHaveBeenCalledWith('/api/create-organization', {name: 'Test Org'})
			expect(result).toEqual(mockResponse)
		})

		it('should throw error when name is missing', async () => {
			await expect(apiFunctions.doCreateOrganization({name: ''})).rejects.toThrow('Name is required')
		})
	})

	describe('doGenerateELN', () => {
		const validParams = {experimentId: 'exp-123', send_email: true, orgId: 'org-123'}

		it('should generate ELN successfully', async () => {
			const mockResponse = {success: true}
			mockApiClient.postToNextJS.mockResolvedValue(mockResponse)

			const result = await apiFunctions.doGenerateELN(validParams)

			expect(mockApiClient.postToNextJS).toHaveBeenCalledWith('/api/generate-eln', validParams, false, true)
			expect(result).toEqual(mockResponse)
		})

		it('should validate required fields', async () => {
			await expect(apiFunctions.doGenerateELN({...validParams, experimentId: ''})).rejects.toThrow('Experiment is required')
			await expect(apiFunctions.doGenerateELN({...validParams, orgId: ''})).rejects.toThrow('Organization is required')
		})
	})

	describe('doUpdateUser', () => {
		it('should update user successfully', async () => {
			const mockResponse = {success: true}
			mockApiClient.putToNextJS.mockResolvedValue(mockResponse)

			const result = await apiFunctions.doUpdateUser({
				email: 'test@example.com',
				name: 'Test User'
			})

			expect(mockApiClient.putToNextJS).toHaveBeenCalledWith('/api/update-user', {
				email: 'test@example.com',
				name: 'Test User'
			})
			expect(result).toEqual(mockResponse)
		})
	})

	describe('doLoadExperiment', () => {
		const validParams = {experimentId: 'exp-123', orgId: 'org-123'}

		it('should load experiment successfully', async () => {
			const mockResponse = {id: 'exp-123', title: 'Test Experiment'}
			mockApiClient.getFromNextJS.mockResolvedValue(mockResponse)

			const result = await apiFunctions.doLoadExperiment(validParams)

			expect(mockApiClient.getFromNextJS).toHaveBeenCalledWith('/api/load-experiment?experimentId=exp-123&org_id=org-123')
			expect(result).toEqual(mockResponse)
		})

		it('should validate required fields', async () => {
			await expect(apiFunctions.doLoadExperiment({...validParams, orgId: ''})).rejects.toThrow('Organization is required')
			await expect(apiFunctions.doLoadExperiment({...validParams, experimentId: ''})).rejects.toThrow('Experiment id is required')
		})
	})

	describe('doGetExperiments', () => {
		it('should get experiments successfully', async () => {
			const mockResponse = {experiments: []}
			mockApiClient.getFromNextJS.mockResolvedValue(mockResponse)

			const result = await apiFunctions.doGetExperiments({orgId: 'org-123'})

			expect(mockApiClient.getFromNextJS).toHaveBeenCalledWith('/api/get-experiments?org_id=org-123')
			expect(result).toEqual(mockResponse)
		})

		it('should validate orgId', async () => {
			await expect(apiFunctions.doGetExperiments({orgId: ''})).rejects.toThrow('Organization is required')
		})
	})

	describe('doGetSessionSummary', () => {
		it('should get session summary successfully', async () => {
			const mockResponse = {summary: 'test'}
			const params = new URLSearchParams({param1: 'value1'})
			mockApiClient.getFromNextJS.mockResolvedValue(mockResponse)

			const result = await apiFunctions.doGetSessionSummary({experimentId: 'exp-123', params})

			expect(mockApiClient.getFromNextJS).toHaveBeenCalledWith('/api/get-session-summary?experimentId=exp-123&param1=value1')
			expect(result).toEqual(mockResponse)
		})

		it('should validate experimentId', async () => {
			const params = new URLSearchParams()
			await expect(apiFunctions.doGetSessionSummary({experimentId: '', params})).rejects.toThrow('Experiment id is required')
		})
	})

	describe('doGetLabFeed', () => {
		it('should get lab feed successfully', async () => {
			const mockResponse = {feed: []}
			mockApiClient.getFromNextJS.mockResolvedValue(mockResponse)

			const result = await apiFunctions.doGetLabFeed({orgId: 'org-123'})

			expect(mockApiClient.getFromNextJS).toHaveBeenCalledWith('/api/get-lab-feed?org_id=org-123&limit=10&max_experiments=20')
			expect(result).toEqual(mockResponse)
		})

		it('should validate orgId', async () => {
			await expect(apiFunctions.doGetLabFeed({orgId: ''})).rejects.toThrow('Experiment id is required')
		})
	})

	describe('doGetUserOrganizations', () => {
		it('should get user organizations successfully', async () => {
			const mockResponse = {organizations: []}
			mockApiClient.getFromNextJS.mockResolvedValue(mockResponse)

			const result = await apiFunctions.doGetUserOrganizations({email: 'test@example.com'})

			expect(mockApiClient.getFromNextJS).toHaveBeenCalledWith('/api/get-user-organizations?email=test@example.com')
			expect(result).toEqual(mockResponse)
		})

		it('should validate email', async () => {
			await expect(apiFunctions.doGetUserOrganizations({email: ''})).rejects.toThrow('Email id is required')
		})
	})

	describe('doGetSessionToken', () => {
		it('should get session token successfully', async () => {
			const mockResponse = {token: 'abc123'}
			const params = new URLSearchParams({param1: 'value1'})
			mockApiClient.getFromNextJS.mockResolvedValue(mockResponse)

			const result = await apiFunctions.doGetSessionToken({params})

			expect(mockApiClient.getFromNextJS).toHaveBeenCalledWith('/api/session-token?param1=value1')
			expect(result).toEqual(mockResponse)
		})
	})

	describe('Error handling', () => {
		it('should propagate API client errors', async () => {
			const error = new Error('API Error')
			mockApiClient.postToNextJS.mockRejectedValue(error)

			await expect(
				apiFunctions.doRegisterExperiment({
					title: 'Test',
					protocol: 'Test',
					orgId: 'org-123'
				})
			).rejects.toThrow('API Error')
		})

		it('should propagate network errors', async () => {
			const error = new Error('Network Error')
			mockApiClient.getFromNextJS.mockRejectedValue(error)

			await expect(apiFunctions.doGetExperiments({orgId: 'org-123'})).rejects.toThrow('Network Error')
		})
	})
})

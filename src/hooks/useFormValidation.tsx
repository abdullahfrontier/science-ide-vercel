import {useState, useCallback} from 'react'

interface FormValidationOptions {
	onSuccess?: (data?: any) => void
	onError?: (error: string) => void
	resetOnSuccess?: boolean
}

interface UseFormValidationReturn {
	loading: boolean
	error: string
	success: boolean
	handleSubmit: (submitFn: () => Promise<any>) => Promise<void>
	setError: (error: string) => void
	setSuccess: (success: boolean) => void
	resetState: () => void
}

export const useFormValidation = (options: FormValidationOptions = {}): UseFormValidationReturn => {
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState('')
	const [success, setSuccess] = useState(false)

	const {onSuccess, onError, resetOnSuccess = true} = options

	const resetState = useCallback(() => {
		setError('')
		setSuccess(false)
		setLoading(false)
	}, [])

	const handleSubmit = useCallback(
		async (submitFn: () => Promise<any>) => {
			setError('')
			setSuccess(false)
			setLoading(true)

			try {
				const result = await submitFn()
				setSuccess(true)

				if (onSuccess) {
					onSuccess(result)
				}

				if (resetOnSuccess) {
					// Reset success after a delay to show the success state
					setTimeout(() => setSuccess(false), 100)
				}
			} catch (err) {
				const errorMessage = err instanceof Error ? err.message : 'An error occurred'
				setError(errorMessage)

				if (onError) {
					onError(errorMessage)
				}
			} finally {
				setLoading(false)
			}
		},
		[onSuccess, onError, resetOnSuccess]
	)

	return {
		loading,
		error,
		success,
		handleSubmit,
		setError,
		setSuccess,
		resetState
	}
}

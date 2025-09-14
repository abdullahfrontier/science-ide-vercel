import {useEffect, useState, useRef} from 'react'
import {useRouter} from 'next/router'
import {cognitoAuth} from '@/lib/cognito-auth'
import {Provider, useDispatch, useSelector} from 'react-redux'
import {store, RootState, AppDispatch, persistor} from '@/store'
import {login} from '@/store/thunks/authThunk'
import {FullPageLoader} from '@/components/common/FullPageLoader'
import {scheduleTokenRefresh} from '@/lib/refresh-token'

export default function AuthCallbackPage() {
	const dispatch = useDispatch<AppDispatch>()
	const router = useRouter()
	const [error, setError] = useState<string | null>(null)
	const isProcessing = useRef(false)

	useEffect(() => {
		const handleCallback = async () => {
			// Prevent duplicate execution
			if (isProcessing.current) {
				console.log('Already processing auth callback, skipping...')
				return
			}

			// Get the authorization code from URL
			const urlParams = new URLSearchParams(window.location.search)
			const code = urlParams.get('code')
			const error = urlParams.get('error')

			if (error) {
				setError(`Authentication failed: ${error}`)
				return
			}

			if (!code) {
				setError('No authorization code received')
				return
			}

			// Check if this code was already processed
			const processedCode = sessionStorage.getItem('processed_auth_code')
			if (processedCode === code) {
				console.log('Auth code already processed, checking for tokens...')
				// todo...If we have tokens, redirect
				return
			}

			isProcessing.current = true

			try {
				console.log('Exchanging code for tokens...')
				console.log('Code:', code.substring(0, 10) + '...')

				// Exchange code for tokens
				const data = await cognitoAuth.handleCallback(code)

				// Mark this code as processed
				sessionStorage.setItem('processed_auth_code', code)

				console.log('Token exchange successful')

				// Clear the URL parameters to prevent reprocessing
				window.history.replaceState({}, document.title, window.location.pathname)

				scheduleTokenRefresh()
				dispatch(login(data))
			} catch (err) {
				console.error('Auth callback error:', err)
				setError(err instanceof Error ? err.message : 'Authentication failed')
				isProcessing.current = false
				// Clear the processed code on error so user can retry
				sessionStorage.removeItem('processed_auth_code')
			}
		}

		handleCallback()
	}, [router])

	if (error) {
		return (
			<div className="min-h-screen flex items-center justify-center">
				<div className="text-center">
					<h1 className="text-2xl font-bold text-red-600 mb-4">Authentication Error</h1>
					<p className="text-gray-600 mb-4">{error}</p>
					<button onClick={() => router.push('/login')} className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
						Back to Login
					</button>
				</div>
			</div>
		)
	}

	return <FullPageLoader message="Authenticating..." />
}

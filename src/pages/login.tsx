import {LoginForm} from '@/components/auth/LoginForm'
import {useSelector} from 'react-redux'
import type {RootState} from '@/store'
import {useRouter} from 'next/router'
import {useEffect, useState} from 'react'
import {FullPageLoader} from '@/components/common/FullPageLoader'

export default function Login() {
	const {isAuthenticated, loading} = useSelector((state: RootState) => state.auth)
	const router = useRouter()
	const [redirecting, setRedirecting] = useState(false)

	useEffect(() => {
		if (!loading && isAuthenticated && !redirecting) {
			setRedirecting(true)
			router.replace('/select-organization')
		}
	}, [isAuthenticated, loading, router, redirecting])

	if (loading || redirecting) {
		return <FullPageLoader />
	}

	return <LoginForm />
}

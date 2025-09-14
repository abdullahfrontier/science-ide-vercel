import {useSelector} from 'react-redux'
import type {RootState} from '@/store'
import MainLayout from '@/components/layouts/MainLayout'
import {FullPageLoader} from '@/components/common/FullPageLoader'

export default function HomePage() {
	const {isAuthenticated, loading} = useSelector((state: RootState) => state.auth)

	return <MainLayout />
	console.log('isAuthenticated ' + isAuthenticated)
	return loading ? <FullPageLoader /> : isAuthenticated ? <MainLayout /> : null
}

import {useRouter} from 'next/router'
import type {AppProps} from 'next/app'

import {AntdRegistry} from '@ant-design/nextjs-registry'
import {ConfigProvider as AntdConfigProvider} from 'antd'
import {ErrorBoundary} from '@/components/common/ErrorBoundary'
import {ToastProvider} from '@/components/toast/ToasterProvider'
import {ConfigProvider} from '@/hooks/useConfig'
import {PersistGate} from 'redux-persist/integration/react'

import {Provider, useDispatch, useSelector} from 'react-redux'
import {store, RootState, AppDispatch, persistor} from '@/store'
import {useEffect, useState} from 'react'
import {Spin} from 'antd'

import '@/styles/globals.css'
import '@/lib/crypto-polyfill'
import '@/lib/media-polyfill'
import {FullPageLoader} from '@/components/common/FullPageLoader'
import {scheduleTokenRefresh} from '@/lib/refresh-token'

export const AuthInitializer = ({children}: {children: React.ReactNode}) => {
	const router = useRouter()
	const dispatch = useDispatch<AppDispatch>()
	const {isAuthenticated, idToken} = useSelector((state: RootState) => state.auth)
	const [authChecked, setAuthChecked] = useState(false)

	useEffect(() => {
		setAuthChecked(true)
	}, [])

	useEffect(() => {
		if (!authChecked) return
		if (isAuthenticated) {
			// scheduleTokenRefresh()
			router.replace('/')
			// if (router.pathname === '/login' || router.pathname === '/auth/callback') {
			// 	router.replace('/select-organization')
			// }
		} else {
			if (!['/login'].includes(router.pathname) && !['/auth/callback'].includes(router.pathname)) {
				// router.replace('/login')
			}
		}
	}, [authChecked, isAuthenticated, idToken, dispatch, router.pathname])

	if (!authChecked) return <FullPageLoader />

	return <>{children}</>
}

export default function App({Component, pageProps}: AppProps) {
	const [showChild, setShowChild] = useState(false)

	// wait until after client-side hydration to show
	useEffect(() => {
		setShowChild(true)
	}, [])

	if (!showChild) {
		return <FullPageLoader />
	}

	return (
		<Provider store={store}>
			<PersistGate
				loading={
					<div className="min-h-screen flex items-center justify-center">
						<Spin size="large" />
					</div>
				}
				persistor={persistor}>
				<AuthInitializer>
					<AntdRegistry>
						<ErrorBoundary>
							<ToastProvider>
								<AntdConfigProvider>
									<ConfigProvider>
										<Component {...pageProps} />
									</ConfigProvider>
								</AntdConfigProvider>
							</ToastProvider>
						</ErrorBoundary>
					</AntdRegistry>
				</AuthInitializer>
			</PersistGate>
		</Provider>
	)
}

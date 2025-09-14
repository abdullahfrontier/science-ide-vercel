import {WebStorage} from 'redux-persist/es/types'

const createNoopStorage = (): WebStorage => {
	return {
		getItem(_key: string) {
			return Promise.resolve(null)
		},
		setItem(_key: string, value: any) {
			return Promise.resolve(value)
		},
		removeItem(_key: string) {
			return Promise.resolve()
		}
	}
}

const storage: WebStorage = typeof window !== 'undefined' ? require('redux-persist/lib/storage').default : createNoopStorage()

export default storage

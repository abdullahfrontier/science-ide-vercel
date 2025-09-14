import {useToast} from '@/components/toast/ToasterProvider'

export type ToastType = 'error' | 'success' | 'info'
export type ToastProps = {
	message: string
	type: ToastType
	onDismiss: () => void
}

export const PlaygroundToast = () => {
	const {toastMessage, setToastMessage} = useToast()

	const getToastStyles = (type: ToastType) => {
		switch (type) {
			case 'error':
				return {
					container: 'bg-red-50 border-red-200 text-red-800',
					button: 'hover:bg-red-100 text-red-600 hover:text-red-800',
					icon: '🚨'
				}
			case 'success':
				return {
					container: 'bg-emerald-50 border-emerald-200 text-emerald-800',
					button: 'hover:bg-emerald-100 text-emerald-600 hover:text-emerald-800',
					icon: '✅'
				}
			default: // info
				return {
					container: 'bg-amber-50 border-amber-200 text-amber-800',
					button: 'hover:bg-amber-100 text-amber-600 hover:text-amber-800',
					icon: 'ℹ️'
				}
		}
	}

	if (!toastMessage) return null

	const styles = getToastStyles(toastMessage.type)

	return (
		<div className={`absolute text-sm break-words px-4 pr-12 py-4 ${styles.container} rounded-lg border shadow-lg backdrop-blur-sm top-4 left-4 right-4 max-w-md mx-auto flex items-start gap-3`}>
			<span className="text-lg mt-0.5 flex-shrink-0">{styles.icon}</span>
			<span className="flex-1 font-medium leading-relaxed">{toastMessage.message}</span>
			<button
				className={`flex-shrink-0 border border-transparent rounded-md p-1 transition-colors ${styles.button}`}
				onClick={() => {
					setToastMessage(null)
				}}
				aria-label="Dismiss notification">
				<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none">
					<path fillRule="evenodd" clipRule="evenodd" d="M5.29289 5.29289C5.68342 4.90237 6.31658 4.90237 6.70711 5.29289L12 10.5858L17.2929 5.29289C17.6834 4.90237 18.3166 4.90237 18.7071 5.29289C19.0976 5.68342 19.0976 6.31658 18.7071 6.70711L13.4142 12L18.7071 17.2929C19.0976 17.6834 19.0976 18.3166 18.7071 18.7071C18.3166 19.0976 17.6834 19.0976 17.2929 18.7071L12 13.4142L6.70711 18.7071C6.31658 19.0976 5.68342 19.0976 5.29289 18.7071C4.90237 18.3166 4.90237 17.6834 5.29289 17.2929L10.5858 12L5.29289 6.70711C4.90237 6.31658 4.90237 5.68342 5.29289 5.29289Z" fill="currentColor" />
				</svg>
			</button>
		</div>
	)
}

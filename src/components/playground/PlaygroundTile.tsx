import {ReactNode, useState} from 'react'

const titleHeight = 32

type PlaygroundTileProps = {
	title?: string
	children?: ReactNode
	className?: string
	childrenClassName?: string
	padding?: boolean
	backgroundColor?: string
}

export type PlaygroundTab = {
	title: string
	content: ReactNode
}

export type PlaygroundTabbedTileProps = {
	tabs: PlaygroundTab[]
	initialTab?: number
} & PlaygroundTileProps

export const PlaygroundTile: React.FC<PlaygroundTileProps> = ({children, title, className, childrenClassName, padding = true, backgroundColor = 'transparent'}) => {
	const contentPadding = padding ? 4 : 0
	const bgClass = backgroundColor === 'transparent' ? 'bg-transparent' : backgroundColor === 'gray-950' ? 'bg-muted' : `bg-${backgroundColor}`

	return (
		<div className={`flex flex-col border rounded-lg border-border text-muted-foreground ${bgClass} shadow-sm ${className}`}>
			{title && (
				<div
					className="flex-shrink-0 flex items-center justify-center text-xs uppercase py-3 border-b border-border tracking-wider bg-secondary/20 font-medium text-secondary-foreground"
					style={{
						height: `${titleHeight}px`
					}}>
					<h2>{title}</h2>
				</div>
			)}
			<div
				className={`flex flex-col items-center flex-1 w-full min-h-0 overflow-auto ${childrenClassName}`}
				style={{
					padding: `${contentPadding * 4}px`
				}}>
				{children}
			</div>
		</div>
	)
}

export const PlaygroundTabbedTile: React.FC<PlaygroundTabbedTileProps> = ({tabs, initialTab = 0, className, childrenClassName, backgroundColor = 'transparent'}) => {
	const contentPadding = 4
	const [activeTab, setActiveTab] = useState(initialTab)

	if (activeTab >= tabs.length) {
		return null
	}

	const bgClass = backgroundColor === 'transparent' ? 'bg-transparent' : backgroundColor === 'gray-950' ? 'bg-muted' : `bg-${backgroundColor}`

	return (
		<div className={`flex flex-col h-full ${bgClass} ${className}`}>
			{/* Tab Headers */}
			<div
				className="flex-shrink-0 flex items-center justify-start text-xs uppercase border-b border-border tracking-wider bg-secondary/10"
				style={{
					height: `${titleHeight}px`
				}}>
				{tabs.map((tab, index) => (
					<button key={index} className={`px-4 py-2 rounded-none hover:bg-accent hover:text-accent-foreground border-r border-border font-medium transition-colors ${index === activeTab ? 'bg-secondary text-secondary-foreground' : 'bg-transparent text-muted-foreground'} ${index === tabs.length - 1 ? 'border-r-0' : ''}`} onClick={() => setActiveTab(index)}>
						{tab.title}
					</button>
				))}
			</div>

			{/* Tab Content */}
			<div
				className={`flex-1 w-full min-h-0 overflow-auto ${childrenClassName}`}
				style={{
					padding: `${contentPadding * 4}px`
				}}>
				{tabs[activeTab].content}
			</div>
		</div>
	)
}

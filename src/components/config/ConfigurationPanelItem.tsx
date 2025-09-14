import {ReactNode} from 'react'
import {PlaygroundDeviceSelector} from '@/components/playground/PlaygroundDeviceSelector'
import {TrackToggle} from '@livekit/components-react'
import {Track} from 'livekit-client'

type ConfigurationPanelItemProps = {
	title: string
	children?: ReactNode
	deviceSelectorKind?: MediaDeviceKind
}

export const ConfigurationPanelItem: React.FC<ConfigurationPanelItemProps> = ({children, title, deviceSelectorKind}) => {
	return (
		<div className="w-full text-foreground py-6 border-b border-border relative">
			<div className="flex flex-row justify-between items-center px-4 text-xs uppercase tracking-wider font-medium">
				<h3 className="text-muted-foreground">{title}</h3>
				{deviceSelectorKind && (
					<span className="flex flex-row gap-3">
						<TrackToggle className="px-3 py-2 bg-background text-foreground border border-input rounded-lg hover:bg-accent hover:text-accent-foreground transition-colors" source={deviceSelectorKind === 'audioinput' ? Track.Source.Microphone : Track.Source.Camera} />
						<PlaygroundDeviceSelector kind={deviceSelectorKind} />
					</span>
				)}
			</div>
			{children && <div className="px-4 py-3 text-sm text-muted-foreground leading-relaxed">{children}</div>}
		</div>
	)
}

import Head from 'next/head'
import {useConfig} from '@/hooks/useConfig'

interface PageHeadProps {
	title?: string
	description?: string
}

export default function PageHead({title = '', description = ''}: PageHeadProps) {
	const {config} = useConfig()

	return (
		<Head>
			<title>{config.title ? `${config.title} - Start Experiment` : 'Start Experiment'}</title>
			<meta name="description" content={config.description || 'Start a new experiment.'} />
			<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
			<meta name="apple-mobile-web-app-capable" content="yes" />
			<meta name="apple-mobile-web-app-status-bar-style" content="black" />
			<link rel="icon" href="/favicon.ico" />

			<meta property="og:image" content="https://livekit.io/images/og/agents-playground.png" />
			<meta property="og:image:width" content="1200" />
			<meta property="og:image:height" content="630" />
		</Head>
	)
}

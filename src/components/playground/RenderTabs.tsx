/* eslint-disable no-console */
'use client'

import {ExperimentTabs} from '@/components/experiment/ExperimentTabs'
import React from 'react'

interface PlaygroundProps {
	handleRowComplete: (csvRow: string) => Promise<void>
	experimentId: string
}

export default function RenderTabs({handleRowComplete, experimentId}: PlaygroundProps) {
	return (
		<div className={'w-full h-full'}>
			<ExperimentTabs
				onRowComplete={handleRowComplete}
				experimentId={experimentId}
				onSessionStart={() => {
					// This enables the refresh functionality
				}}
			/>
		</div>
	)
}

'use client'

import React, {useState} from 'react'
import {Card, Typography, Radio, Space} from 'antd'
import CollaborativeEditor from './CollaborativeEditor'

const {Title, Paragraph} = Typography

type Alternative = {
	id: string
	label: string
	text: string
}

type Props = {
	alternatives?: Alternative[]
}

export default function EditorWithAlternatives({
	alternatives = [
		{
			id: 'A',
			label: 'Alternative A',
			text: ''
		},
		{
			id: 'B',
			label: 'Alternative B',
			text: ''
		}
	]
}: Props) {
	const [selected, setSelected] = useState<string | null>(null)

	return (
		<div className="space-y-6">
			{/* Main Editor */}
			{/* <CollaborativeEditor /> */}

			{/* Alternatives Section */}
			{alternatives.length > 0 && (
				<div style={{marginTop: 24}}>
					<Space size="large" align="start">
						{alternatives.map((alt) => (
							<Card key={alt.id} title={alt.label} style={{width: 350}}>
								<Paragraph>{alt.text}</Paragraph>
							</Card>
						))}
					</Space>

					{/* Rating Buttons */}
					<div style={{marginTop: 20}}>
						<Title level={5}>Rate Best</Title>
						<Radio.Group onChange={(e) => setSelected(e.target.value)} value={selected}>
							{alternatives.map((alt) => (
								<Radio.Button key={alt.id} value={alt.id}>
									{alt.id}
								</Radio.Button>
							))}
							<Radio.Button value="Original">Original</Radio.Button>
							<Radio.Button value="None">None</Radio.Button>
						</Radio.Group>
					</div>
				</div>
			)}
		</div>
	)
}

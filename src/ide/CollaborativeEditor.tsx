'use client'

import React, {useEffect, useRef} from 'react'
import {LexicalComposer} from '@lexical/react/LexicalComposer'
import {RichTextPlugin} from '@lexical/react/LexicalRichTextPlugin'
import {ContentEditable} from '@lexical/react/LexicalContentEditable'
import {HistoryPlugin} from '@lexical/react/LexicalHistoryPlugin'
import LexicalErrorBoundary from '@lexical/react/LexicalErrorBoundary'

import AutocompletePlugin from './AutocompletePlugin'
import {AutocompleteNode} from './AutocompleteNode'
import {LexicalToolbar} from './LexicalToolbar'
import {MiniAIToolbar} from './MiniAIToolbar'

export default function CollaborativeEditor() {
	const editorRef = useRef<HTMLDivElement>(null)

	const initialConfig = {
		namespace: 'MyEditor',
		nodes: [AutocompleteNode],
		theme: {
			paragraph: 'mb-2',
			text: {
				bold: 'font-bold',
				italic: 'italic',
				underline: 'underline',
				code: 'font-mono bg-gray-100 px-1 rounded'
			}
		},
		onError(error: Error) {
			console.error(error)
		}
	}

	useEffect(() => {
		if (editorRef.current) {
			const range = document.createRange()
			const sel = window.getSelection()
			const firstChild = editorRef.current.firstChild
			if (firstChild) {
				range.setStart(firstChild, 0)
				range.collapse(true)
				sel?.removeAllRanges()
				sel?.addRange(range)
				editorRef.current.focus()
			}
		}
	}, [])

	return (
		<div className="border rounded-lg bg-white shadow-md">
			<LexicalComposer initialConfig={initialConfig}>
				<LexicalToolbar />

				{/* Editor Container */}
				<div className="relative p-4">
					<RichTextPlugin contentEditable={<ContentEditable ref={editorRef} className="outline-none w-full min-h-[300px] text-gray-900 text-base leading-6" />} placeholder={<div className="absolute top-4 left-4 text-gray-400 pointer-events-none select-none">Start typing...</div>} ErrorBoundary={LexicalErrorBoundary} />
					<MiniAIToolbar />
				</div>

				<HistoryPlugin />
				<AutocompletePlugin />
			</LexicalComposer>
		</div>
	)
}

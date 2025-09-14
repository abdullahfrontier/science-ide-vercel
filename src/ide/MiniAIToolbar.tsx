'use client'

import React, {useEffect, useRef, useState} from 'react'
import {LexicalComposer} from '@lexical/react/LexicalComposer'
import {RichTextPlugin} from '@lexical/react/LexicalRichTextPlugin'
import {ContentEditable} from '@lexical/react/LexicalContentEditable'
import {HistoryPlugin} from '@lexical/react/LexicalHistoryPlugin'
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext'
import {FORMAT_TEXT_COMMAND, SELECTION_CHANGE_COMMAND, $getSelection, $isRangeSelection, $isTextNode} from 'lexical'
import LexicalErrorBoundary from '@lexical/react/LexicalErrorBoundary'
import {Button, Tooltip} from 'antd'
import {Bold, Italic, Underline, Code} from 'lucide-react'

// Mini Toolbar Component
export const MiniAIToolbar: React.FC = () => {
	const [editor] = useLexicalComposerContext()
	const [isVisible, setIsVisible] = useState(false)
	const [position, setPosition] = useState({top: 0, left: 0})
	const [formats, setFormats] = useState({bold: false, italic: false, underline: false, code: false})
	const toolbarRef = useRef<HTMLDivElement>(null)

	const updatePosition = () => {
		const selection = window.getSelection()
		if (!selection || selection.rangeCount === 0) return
		const range = selection.getRangeAt(0)
		const rect = range.getBoundingClientRect()
		if (!rect || (rect.x === 0 && rect.y === 0)) return
		setPosition({top: rect.bottom + window.scrollY + 8, left: rect.left + rect.width / 2 + window.scrollX})
	}

	useEffect(() => {
		const unregister = editor.registerCommand(
			SELECTION_CHANGE_COMMAND,
			() => {
				editor.getEditorState().read(() => {
					const selection = $getSelection()
					if ($isRangeSelection(selection) && !selection.isCollapsed()) {
						setIsVisible(true)
						setTimeout(updatePosition, 0)
					} else {
						setIsVisible(false)
					}
				})
				return false
			},
			1
		)
		return () => unregister()
	}, [editor])

	useEffect(() => {
		return editor.registerUpdateListener(({editorState}) => {
			editorState.read(() => {
				const selection = $getSelection()
				if ($isRangeSelection(selection)) {
					const node = selection.getNodes()[0]
					if ($isTextNode(node)) {
						setFormats({
							bold: node.hasFormat('bold'),
							italic: node.hasFormat('italic'),
							underline: node.hasFormat('underline'),
							code: node.hasFormat('code')
						})
					}
				}
			})
		})
	}, [editor])

	const exec = (cmd: any, val?: any) => editor.dispatchCommand(cmd, val)
	const btnClass = (active: boolean) => (active ? 'bg-cyan-100 text-cyan-700 border border-cyan-300' : 'hover:bg-gray-100')

	if (!isVisible) return null

	return (
		<div ref={toolbarRef} className="fixed z-50 flex gap-1 bg-white border rounded-lg shadow-lg px-2 py-1" style={{top: `${position.top}px`, left: `${position.left}px`, transform: 'translate(-50%, 0)'}}>
			<Tooltip title="Bold">
				<Button size="small" className={btnClass(formats.bold)} icon={<Bold size={16} />} onClick={() => exec(FORMAT_TEXT_COMMAND, 'bold')} />
			</Tooltip>
			<Tooltip title="Italic">
				<Button size="small" className={btnClass(formats.italic)} icon={<Italic size={16} />} onClick={() => exec(FORMAT_TEXT_COMMAND, 'italic')} />
			</Tooltip>
			<Tooltip title="Underline">
				<Button size="small" className={btnClass(formats.underline)} icon={<Underline size={16} />} onClick={() => exec(FORMAT_TEXT_COMMAND, 'underline')} />
			</Tooltip>
			<Tooltip title="Code">
				<Button size="small" className={btnClass(formats.code)} icon={<Code size={16} />} onClick={() => exec(FORMAT_TEXT_COMMAND, 'code')} />
			</Tooltip>
		</div>
	)
}

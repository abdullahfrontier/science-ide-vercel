'use client'

import React, {useEffect, useState} from 'react'
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext'
import {FORMAT_TEXT_COMMAND, FORMAT_ELEMENT_COMMAND, UNDO_COMMAND, REDO_COMMAND, $getSelection, $isRangeSelection} from 'lexical'
import {Button, Tooltip, Select, Upload} from 'antd'
import {Undo, Redo, Bold, Italic, Underline, Code, AlignLeft, AlignCenter, AlignRight, AlignJustify, Paperclip} from 'lucide-react'

const {Option} = Select

export const LexicalToolbar: React.FC = () => {
	const [editor] = useLexicalComposerContext()
	const [formats, setFormats] = useState({
		bold: false,
		italic: false,
		underline: false,
		code: false
	})
	const [blockType, setBlockType] = useState('paragraph')
	const [fontSize, setFontSize] = useState('16px')

	useEffect(() => {
		return editor.registerUpdateListener(({editorState}) => {
			editorState.read(() => {
				const selection = $getSelection()
				if ($isRangeSelection(selection)) {
					setFormats({
						bold: selection.hasFormat('bold'),
						italic: selection.hasFormat('italic'),
						underline: selection.hasFormat('underline'),
						code: selection.hasFormat('code')
					})
				}
			})
		})
	}, [editor])

	const exec = (command: any, payload?: any) => editor.dispatchCommand(command, payload)
	const btnClass = (active: boolean) => (active ? 'bg-cyan-100 text-cyan-700 border border-cyan-300' : 'hover:bg-gray-100')

	return (
		<div className="flex items-center gap-2 bg-white border-b p-2 sticky top-0 z-10">
			<Tooltip title="Undo">
				<Button size="small" icon={<Undo size={16} />} onClick={() => exec(UNDO_COMMAND)} />
			</Tooltip>
			<Tooltip title="Redo">
				<Button size="small" icon={<Redo size={16} />} onClick={() => exec(REDO_COMMAND)} />
			</Tooltip>

			{/* Block Type */}
			<Select size="small" value={blockType} onChange={(val) => setBlockType(val)} style={{width: 120}}>
				<Option value="paragraph">Normal</Option>
				<Option value="h1">Heading 1</Option>
				<Option value="h2">Heading 2</Option>
				<Option value="h3">Heading 3</Option>
			</Select>

			{/* Font Size */}
			<Select size="small" value={fontSize} onChange={(val) => setFontSize(val)} style={{width: 80}}>
				{['12px', '14px', '16px', '18px', '24px', '32px'].map((size) => (
					<Option key={size} value={size}>
						{size}
					</Option>
				))}
			</Select>

			{/* Formatting */}
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

			{/* Alignment */}
			<Tooltip title="Align Left">
				<Button size="small" icon={<AlignLeft size={16} />} onClick={() => exec(FORMAT_ELEMENT_COMMAND, 'left')} />
			</Tooltip>
			<Tooltip title="Center">
				<Button size="small" icon={<AlignCenter size={16} />} onClick={() => exec(FORMAT_ELEMENT_COMMAND, 'center')} />
			</Tooltip>
			<Tooltip title="Right">
				<Button size="small" icon={<AlignRight size={16} />} onClick={() => exec(FORMAT_ELEMENT_COMMAND, 'right')} />
			</Tooltip>
			<Tooltip title="Justify">
				<Button size="small" icon={<AlignJustify size={16} />} onClick={() => exec(FORMAT_ELEMENT_COMMAND, 'justify')} />
			</Tooltip>

			{/* Attach */}
			<Upload beforeUpload={() => false} showUploadList={false}>
				<Button size="small" icon={<Paperclip size={16} />} />
			</Upload>
		</div>
	)
}

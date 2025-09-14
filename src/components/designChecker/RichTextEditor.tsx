'use client'

import dynamic from 'next/dynamic'
import 'react-quill/dist/quill.snow.css'
import {useState, useEffect} from 'react'

const ReactQuill = dynamic(() => import('react-quill'), {
	ssr: false,
	loading: () => (
		<div
			style={{
				height: '300px',
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				backgroundColor: '#fafafa',
				border: '1px solid #d9d9d9',
				borderRadius: '6px'
			}}>
			Loading editor...
		</div>
	)
})

interface RichTextEditorProps {
	value: string
	onChange: (value: string) => void
	placeholder?: string
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({value, onChange, placeholder = 'Paste your design document text here...'}) => {
	const [isClient, setIsClient] = useState(false)

	useEffect(() => {
		setIsClient(true)
		// Load actual Quill styles after component mounts
		if (typeof window !== 'undefined') {
			const link = document.createElement('link')
			link.rel = 'stylesheet'
			link.href = 'https://cdn.quilljs.com/1.3.6/quill.snow.css'
			document.head.appendChild(link)

			return () => {
				// Cleanup on unmount
				document.head.removeChild(link)
			}
		}
	}, [])

	const modules = {
		toolbar: [[{header: [1, 2, 3, false]}], ['bold', 'italic', 'underline', 'strike'], [{list: 'ordered'}, {list: 'bullet'}], [{indent: '-1'}, {indent: '+1'}], ['link'], ['clean']]
	}

	const formats = ['header', 'bold', 'italic', 'underline', 'strike', 'list', 'bullet', 'indent', 'link']

	if (!isClient) {
		return <div className="h-[350px] flex items-center justify-center bg-neutral-gray border border-light-gray rounded-lg">Loading editor...</div>
	}

	return (
		<div className="rich-text-editor">
			<ReactQuill theme="snow" value={value} onChange={onChange} modules={modules} formats={formats} placeholder={placeholder} className="h-[300px] mb-[50px]" />
		</div>
	)
}

export default RichTextEditor

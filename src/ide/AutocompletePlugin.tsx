import type {BaseSelection, NodeKey, TextNode, LexicalNode} from 'lexical'
import type {JSX} from 'react'

import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext'
import {mergeRegister} from '@lexical/utils'
import {$addUpdateTag, $createTextNode, $getNodeByKey, $getSelection, $isRangeSelection, $isTextNode, $setSelection, $getRoot, COMMAND_PRIORITY_LOW, KEY_ARROW_RIGHT_COMMAND, KEY_TAB_COMMAND, KEY_ESCAPE_COMMAND, $isElementNode} from 'lexical'
import {useCallback, useEffect} from 'react'

import {useToolbarState} from './ToolbarContext'
import {$createAutocompleteNode, AutocompleteNode} from './AutocompleteNode'
import {addSwipeRightListener} from './swipe'
import {getAutocompleteSuggestion} from './ai'

const HISTORY_MERGE = {tag: 'history-merge'}

declare global {
	interface Navigator {
		userAgentData?: {
			mobile: boolean
		}
	}
}

type SearchPromise = {
	dismiss: () => void
	promise: Promise<null | string>
}

export const uuid = Math.random()
	.toString(36)
	.replace(/[^a-z]+/g, '')
	.substring(0, 5)

function $search(selection: null | BaseSelection): [boolean, string, string] {
	if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
		return [false, '', '']
	}

	const anchor = selection.anchor
	const anchorNode = anchor.getNode()

	if (!$isTextNode(anchorNode)) {
		return [false, '', '']
	}

	// Get the root node to traverse the entire document
	const root = $getRoot()
	if (!root) {
		console.log('[Autocomplete] No root node found!')
		return [false, '', '']
	}

	// Root node obtained successfully

	let textBefore = ''
	let textAfter = ''
	let foundCursor = false
	const offset = anchor.offset
	let nodeCount = 0
	let textNodeCount = 0

	// Traverse all nodes in the document
	const visitNode = (node: LexicalNode) => {
		nodeCount++

		if ($isTextNode(node)) {
			textNodeCount++
			const nodeText = node.getTextContent()

			if (node === anchorNode) {
				// This is the node containing the cursor
				textBefore += nodeText.slice(0, offset)
				textAfter += nodeText.slice(offset)
				foundCursor = true
			} else if (!foundCursor) {
				// This node comes before the cursor
				textBefore += nodeText
			} else {
				// This node comes after the cursor
				textAfter += nodeText
			}
		} else if ($isElementNode(node)) {
			const children = node.getChildren()
			for (const child of children) {
				visitNode(child)
			}
		}
	}

	visitNode(root)

	// Don't suggest if we're at the very beginning
	if (textBefore.length === 0) {
		return [false, '', '']
	}

	// Check if we should suggest (not right after newline)
	const lastChar = textBefore[textBefore.length - 1]
	const shouldSuggest = lastChar !== '\n' && lastChar !== '\r'

	// Return all text before and after cursor from entire document
	return [shouldSuggest, textBefore, textAfter]
}

function normalizeSuggestion(text: string): string {
	return (
		text
			// Add a space if missing after ., ?, !
			.replace(/([.?!])(?=\S)/g, '$1 ')
			// Collapse multiple spaces
			.replace(/\s{2,}/g, ' ')
			.trim()
	)
}

function useQuery(): (textBefore: string, textAfter: string) => SearchPromise {
	return useCallback((textBefore: string, textAfter: string) => {
		let isDismissed = false

		const dismiss = () => {
			isDismissed = true
		}

		const promise: Promise<null | string> = new Promise(async (resolve, reject) => {
			try {
				if (isDismissed) {
					return reject('Dismissed')
				}

				// Debounce to avoid overwhelming the server and allow for typing
				await new Promise((r) => setTimeout(r, 500))

				if (isDismissed) {
					return reject('Dismissed')
				}

				let suggestion = await getAutocompleteSuggestion(textBefore, textAfter)

				if (suggestion) {
					suggestion = normalizeSuggestion(suggestion)
				}

				if (isDismissed) {
					return reject('Dismissed')
				}

				resolve(suggestion)
			} catch (error) {
				reject(error)
			}
		})

		return {
			dismiss,
			promise
		}
	}, [])
}

function formatSuggestionText(suggestion: string): string {
	const userAgentData = window.navigator.userAgentData
	const isMobile = userAgentData !== undefined ? userAgentData.mobile : window.innerWidth <= 800 && window.innerHeight <= 600

	return suggestion
}

export default function AutocompletePlugin(): JSX.Element | null {
	const [editor] = useLexicalComposerContext()
	const query = useQuery()
	const {toolbarState} = useToolbarState()

	useEffect(() => {
		let autocompleteNodeKey: null | NodeKey = null
		let lastTextBefore: null | string = null
		let lastTextAfter: null | string = null
		let lastSuggestion: null | string = null
		let searchPromise: null | SearchPromise = null
		let prevNodeFormat: number = 0
		let isUpdatingAutocomplete = false

		function $clearSuggestion() {
			const autocompleteNode = autocompleteNodeKey !== null ? $getNodeByKey(autocompleteNodeKey) : null
			if (autocompleteNode !== null && autocompleteNode.isAttached()) {
				autocompleteNode.remove()
				autocompleteNodeKey = null
			}
			if (searchPromise !== null) {
				searchPromise.dismiss()
				searchPromise = null
			}
			lastTextBefore = null
			lastTextAfter = null
			lastSuggestion = null
			prevNodeFormat = 0
		}

		function updateAsyncSuggestion(refSearchPromise: SearchPromise, newSuggestion: null | string) {
			if (searchPromise !== refSearchPromise || newSuggestion === null) {
				return
			}
			isUpdatingAutocomplete = true
			editor.update(() => {
				const selection = $getSelection()
				// Skip the expensive $search call - we already know the text matches
				if (!$isRangeSelection(selection)) {
					isUpdatingAutocomplete = false
					return
				}

				const anchor = selection.anchor
				const currentNode = anchor.getNode()
				if (!$isTextNode(currentNode)) {
					isUpdatingAutocomplete = false
					return
				}

				const offset = anchor.offset
				const nodeText = currentNode.getTextContent()
				prevNodeFormat = currentNode.getFormat()

				// Always use the same approach: insert autocomplete at cursor position
				const autocompleteNode = $createAutocompleteNode(formatSuggestionText(newSuggestion), uuid).setFormat(prevNodeFormat).setStyle(`font-size: ${toolbarState.fontSize}`)
				autocompleteNodeKey = autocompleteNode.getKey()

				// Use Lexical's built-in insertNodes which handles splitting correctly
				selection.insertNodes([autocompleteNode])

				// Move cursor back to just before the autocomplete node
				// This ensures cursor stays at the insertion point
				const newSelection = $getSelection()
				if ($isRangeSelection(newSelection)) {
					const autocompleteNodeFromKey = $getNodeByKey(autocompleteNodeKey)
					if (autocompleteNodeFromKey) {
						// Position cursor right before the autocomplete node
						autocompleteNodeFromKey.selectPrevious()
					}
				}

				lastSuggestion = newSuggestion
				// Set flag immediately after update completes
				isUpdatingAutocomplete = false
			})
		}

		function $handleAutocompleteNodeTransform(node: AutocompleteNode) {
			const key = node.getKey()
			if (node.__uuid === uuid && key !== autocompleteNodeKey) {
				$clearSuggestion()
			}
		}

		function handleUpdate() {
			// Skip updates while we're inserting autocomplete to avoid infinite loops
			if (isUpdatingAutocomplete) {
				return
			}

			editor.update(() => {
				const selection = $getSelection()
				const [hasMatch, textBefore, textAfter] = $search(selection)

				if (!hasMatch) {
					$clearSuggestion()
					return
				}

				// Check if we already have an autocomplete node showing
				if (autocompleteNodeKey !== null) {
					const existingNode = $getNodeByKey(autocompleteNodeKey)
					if (existingNode !== null && existingNode.isAttached()) {
						// Don't start a new search if we already have a suggestion showing
						return
					}
				}

				if (textBefore === lastTextBefore && textAfter === lastTextAfter) {
					return
				}

				$clearSuggestion()
				searchPromise = query(textBefore, textAfter)
				searchPromise.promise
					.then((newSuggestion) => {
						console.log('[Autocomplete] API returned:', JSON.stringify(newSuggestion))
						if (searchPromise !== null && newSuggestion) {
							// Update immediately without additional delays
							requestAnimationFrame(() => {
								if (searchPromise !== null) {
									updateAsyncSuggestion(searchPromise, newSuggestion)
								}
							})
						}
					})
					.catch((e) => {
						if (e !== 'Dismissed') {
							console.error('[Autocomplete] Error:', e)
						}
					})
				lastTextBefore = textBefore
				lastTextAfter = textAfter
			}, HISTORY_MERGE)
		}

		function $handleAutocompleteIntent(): boolean {
			if (lastSuggestion === null || autocompleteNodeKey === null) {
				return false
			}
			const autocompleteNode = $getNodeByKey(autocompleteNodeKey)
			if (autocompleteNode === null) {
				return false
			}

			// Since the API already handles spacing, we can use the suggestion as-is
			// But we still need to check if additional spacing adjustments are needed
			let textToInsert = lastSuggestion

			console.log('[Autocomplete] Inserting:', JSON.stringify(textToInsert))

			// Get the previous and next siblings to understand context
			const prevSibling = autocompleteNode.getPreviousSibling()
			const nextSibling = autocompleteNode.getNextSibling()

			// Only add trailing space if there's no next sibling (end of text)
			// and the suggestion doesn't already end with space
			if (!nextSibling && !textToInsert.endsWith(' ')) {
				textToInsert = textToInsert + ' '
			}

			const textNode = $createTextNode(textToInsert).setFormat(prevNodeFormat).setStyle(`font-size: ${toolbarState.fontSize}`)
			autocompleteNode.replace(textNode)

			// Position cursor after the inserted text
			textNode.select(textNode.getTextContentSize(), textNode.getTextContentSize())

			$clearSuggestion()
			return true
		}

		function $handleKeypressCommand(e: Event) {
			if ($handleAutocompleteIntent()) {
				e.preventDefault()
				return true
			}
			return false
		}

		function $handleEscapeCommand(e: Event) {
			if (autocompleteNodeKey !== null) {
				const autocompleteNode = $getNodeByKey(autocompleteNodeKey)
				if (autocompleteNode !== null && autocompleteNode.isAttached()) {
					$clearSuggestion()
					e.preventDefault()
					return true
				}
			}
			return false
		}

		function handleSwipeRight(_force: number, e: TouchEvent) {
			editor.update(() => {
				if ($handleAutocompleteIntent()) {
					e.preventDefault()
				} else {
					$addUpdateTag(HISTORY_MERGE.tag)
				}
			})
		}

		function unmountSuggestion() {
			editor.update(() => {
				$clearSuggestion()
			}, HISTORY_MERGE)
		}

		const rootElem = editor.getRootElement()

		return mergeRegister(editor.registerNodeTransform(AutocompleteNode, $handleAutocompleteNodeTransform), editor.registerUpdateListener(handleUpdate), editor.registerCommand(KEY_TAB_COMMAND, $handleKeypressCommand, COMMAND_PRIORITY_LOW), editor.registerCommand(KEY_ARROW_RIGHT_COMMAND, $handleKeypressCommand, COMMAND_PRIORITY_LOW), editor.registerCommand(KEY_ESCAPE_COMMAND, $handleEscapeCommand, COMMAND_PRIORITY_LOW), ...(rootElem !== null ? [addSwipeRightListener(rootElem, handleSwipeRight)] : []), unmountSuggestion)
	}, [editor, query, toolbarState.fontSize])

	return null
}

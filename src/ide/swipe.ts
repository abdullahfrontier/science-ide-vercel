export function addSwipeRightListener(element: HTMLElement, callback: (force: number, e: TouchEvent) => void): () => void {
	let startX = 0
	let startY = 0

	function handleTouchStart(e: TouchEvent) {
		const touch = e.touches[0]
		startX = touch.clientX
		startY = touch.clientY
	}

	function handleTouchEnd(e: TouchEvent) {
		if (e.changedTouches.length > 0) {
			const touch = e.changedTouches[0]
			const deltaX = touch.clientX - startX
			const deltaY = touch.clientY - startY

			// Check if it's a horizontal swipe (right direction)
			if (Math.abs(deltaX) > Math.abs(deltaY) && deltaX > 50) {
				const force = Math.min(deltaX / 100, 1)
				callback(force, e)
			}
		}
	}

	element.addEventListener('touchstart', handleTouchStart, {passive: true})
	element.addEventListener('touchend', handleTouchEnd, {passive: true})

	return () => {
		element.removeEventListener('touchstart', handleTouchStart)
		element.removeEventListener('touchend', handleTouchEnd)
	}
}

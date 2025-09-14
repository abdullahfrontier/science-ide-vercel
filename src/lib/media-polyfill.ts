// Polyfill for navigator.mediaDevices and getUserMedia
if (typeof window !== 'undefined' && typeof navigator !== 'undefined') {
	// Ensure navigator.mediaDevices exists
	if (!navigator.mediaDevices) {
		;(navigator as any).mediaDevices = {} as MediaDevices
	}

	// Polyfill getUserMedia
	if (!navigator.mediaDevices.getUserMedia) {
		// Check for older implementations
		const getUserMedia = (navigator as any).getUserMedia || (navigator as any).webkitGetUserMedia || (navigator as any).mozGetUserMedia || (navigator as any).msGetUserMedia

		if (getUserMedia) {
			// Wrap old getUserMedia with Promise
			navigator.mediaDevices.getUserMedia = function (constraints) {
				return new Promise((resolve, reject) => {
					getUserMedia.call(navigator, constraints, resolve, reject)
				})
			}
		} else {
			// No getUserMedia support at all
			navigator.mediaDevices.getUserMedia = function () {
				return Promise.reject(new Error('getUserMedia is not implemented in this browser'))
			}
		}
	}

	// Polyfill enumerateDevices
	if (!navigator.mediaDevices.enumerateDevices) {
		navigator.mediaDevices.enumerateDevices = function () {
			return Promise.resolve([])
		}
	}
}

export {}

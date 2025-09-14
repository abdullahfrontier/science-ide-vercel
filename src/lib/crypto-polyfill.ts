// Polyfill for crypto.randomUUID
if (typeof globalThis.crypto !== 'undefined' && !globalThis.crypto.randomUUID) {
	;(globalThis.crypto as any).randomUUID = function (): string {
		// Use the Web Crypto API to generate random values
		const array = new Uint8Array(16)
		globalThis.crypto.getRandomValues(array)

		// Set version (4) and variant bits
		array[6] = (array[6] & 0x0f) | 0x40 // Version 4
		array[8] = (array[8] & 0x3f) | 0x80 // Variant bits

		// Convert to hex string with proper UUID format
		const hex = Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('')
		return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`
	}
}

export {}

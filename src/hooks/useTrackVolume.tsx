import {Track} from 'livekit-client'
import {useEffect, useState} from 'react'

export const useTrackVolume = (track?: Track) => {
	const [volume, setVolume] = useState(0)
	useEffect(() => {
		if (!track || !track.mediaStream) {
			setVolume(0)
			return
		}

		let ctx: AudioContext | null = null
		let source: MediaStreamAudioSourceNode | null = null
		let analyser: AnalyserNode | null = null
		let interval: NodeJS.Timeout | null = null

		const initializeAudio = async () => {
			try {
				ctx = new AudioContext()

				// Wait for audio context to be ready
				if (ctx.state === 'suspended') {
					await ctx.resume()
				}

				source = ctx.createMediaStreamSource(track.mediaStream!)
				analyser = ctx.createAnalyser()
				analyser.fftSize = 32
				analyser.smoothingTimeConstant = 0
				source.connect(analyser)

				const bufferLength = analyser.frequencyBinCount
				const dataArray = new Uint8Array(bufferLength)

				const updateVolume = () => {
					if (!analyser || ctx?.state !== 'running') return

					analyser.getByteFrequencyData(dataArray)
					let sum = 0
					for (let i = 0; i < dataArray.length; i++) {
						const a = dataArray[i]
						sum += a * a
					}
					setVolume(Math.sqrt(sum / dataArray.length) / 255)
				}

				interval = setInterval(updateVolume, 1000 / 30)
			} catch (error) {
				console.error('Failed to initialize audio context:', error)
				setVolume(0)
			}
		}

		initializeAudio()

		return () => {
			if (interval) {
				clearInterval(interval)
			}
			if (source) {
				source.disconnect()
			}
			if (ctx && ctx.state !== 'closed') {
				ctx.close().catch(console.error)
			}
			setVolume(0)
		}
	}, [track, track?.mediaStream])

	return volume
}

const normalizeFrequencies = (frequencies: Float32Array) => {
	const normalizeDb = (value: number) => {
		const minDb = -100
		const maxDb = -10
		let db = 1 - (Math.max(minDb, Math.min(maxDb, value)) * -1) / 100
		db = Math.sqrt(db)

		return db
	}

	// Normalize all frequency values
	return frequencies.map((value) => {
		if (value === -Infinity) {
			return 0
		}
		return normalizeDb(value)
	})
}

export const useMultibandTrackVolume = (track?: Track, bands: number = 5, loPass: number = 100, hiPass: number = 600) => {
	const [frequencyBands, setFrequencyBands] = useState<Float32Array[]>([])

	useEffect(() => {
		if (!track || !track.mediaStream) {
			setFrequencyBands([])
			return
		}

		let ctx: AudioContext | null = null
		let source: MediaStreamAudioSourceNode | null = null
		let analyser: AnalyserNode | null = null
		let interval: NodeJS.Timeout | null = null

		const initializeAudio = async () => {
			try {
				ctx = new AudioContext()

				// Wait for audio context to be ready
				if (ctx.state === 'suspended') {
					await ctx.resume()
				}

				source = ctx.createMediaStreamSource(track.mediaStream!)
				analyser = ctx.createAnalyser()
				analyser.fftSize = 2048
				source.connect(analyser)

				const bufferLength = analyser.frequencyBinCount
				const dataArray = new Float32Array(bufferLength)

				const updateVolume = () => {
					if (!analyser || ctx?.state !== 'running') return

					analyser.getFloatFrequencyData(dataArray)
					let frequencies: Float32Array = new Float32Array(dataArray.length)
					for (let i = 0; i < dataArray.length; i++) {
						frequencies[i] = dataArray[i]
					}
					frequencies = frequencies.slice(loPass, hiPass)

					const normalizedFrequencies = normalizeFrequencies(frequencies)
					const chunkSize = Math.ceil(normalizedFrequencies.length / bands)
					const chunks: Float32Array[] = []
					for (let i = 0; i < bands; i++) {
						chunks.push(normalizedFrequencies.slice(i * chunkSize, (i + 1) * chunkSize))
					}

					setFrequencyBands(chunks)
				}

				interval = setInterval(updateVolume, 10)
			} catch (error) {
				console.error('Failed to initialize multiband audio context:', error)
				setFrequencyBands([])
			}
		}

		initializeAudio()

		return () => {
			if (interval) {
				clearInterval(interval)
			}
			if (source) {
				source.disconnect()
			}
			if (ctx && ctx.state !== 'closed') {
				ctx.close().catch(console.error)
			}
			setFrequencyBands([])
		}
	}, [track, track?.mediaStream, loPass, hiPass, bands])

	return frequencyBands
}

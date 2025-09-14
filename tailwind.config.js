/** @type {import('tailwindcss').Config} */

const colors = require('tailwindcss/colors')
const shades = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950']
const colorList = ['gray', 'slate', 'green', 'cyan', 'amber', 'violet', 'blue', 'rose', 'pink', 'teal', 'red', 'stone', 'emerald', 'yellow']
const uiElements = ['bg', 'selection:bg', 'border', 'text', 'hover:bg', 'hover:border', 'hover:text', 'ring', 'focus:ring']
const customColors = {
	// Earthy and natural colors
	cyan: colors.cyan,
	green: colors.green,
	emerald: colors.emerald, // Natural green
	amber: colors.amber,
	yellow: colors.yellow, // Mustard yellow variations
	violet: colors.violet,
	blue: colors.blue,
	rose: colors.rose,
	pink: colors.pink,
	teal: colors.teal, // Deep teal
	red: colors.red,
	slate: colors.slate,
	stone: colors.stone, // Warm grays
	neutral: colors.neutral // Beige variations
}

let customShadows = {}
let shadowNames = []
let textShadows = {}
let textShadowNames = []

for (const [name, color] of Object.entries(customColors)) {
	customShadows[`${name}`] = `0px 0px 10px ${color['500']}`
	customShadows[`lg-${name}`] = `0px 0px 20px ${color['600']}`
	textShadows[`${name}`] = `0px 0px 4px ${color['700']}`
	textShadowNames.push(`drop-shadow-${name}`)
	shadowNames.push(`shadow-${name}`)
	shadowNames.push(`shadow-lg-${name}`)
	shadowNames.push(`hover:shadow-${name}`)
}

const safelist = ['bg-black', 'bg-white', 'transparent', 'object-cover', 'object-contain', ...shadowNames, ...textShadowNames, ...shades.flatMap((shade) => [...colorList.flatMap((color) => [...uiElements.flatMap((element) => [`${element}-${color}-${shade}`])])])]

module.exports = {
	content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		colors: {
			transparent: 'transparent',
			current: 'currentColor',
			black: colors.black,
			white: colors.white,
			gray: colors.neutral,
			...customColors
		},
		extend: {
			colors: {
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				// Additional earthy colors
				sage: {
					DEFAULT: 'hsl(var(--sage))',
					foreground: 'hsl(var(--sage-foreground))'
				},
				'warm-gray': {
					DEFAULT: 'hsl(var(--warm-gray))',
					foreground: 'hsl(var(--warm-gray-foreground))'
				},
				'charcol-gray': '#666',
				'white-shade-gray': '#f5f5f5',
				'warm-toned-red': '#ff4d4f',
				'ice-blue': '#f0f8ff',
				'airy-cyan-blue': '#d6f7ff',
				'vivid-orange': '#fa8c16',
				'imperial-red': '#f5222d',
				'creamy-off-white': '#fff7e6',
				'pinkish-white': '#fff2f0',
				'apple-green': '#52c41a',
				'neutral-gray': '#fafafa',
				'light-gray': '#d9d9d9'
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
			},
			dropShadow: {
				...textShadows
			},
			boxShadow: {
				...customShadows
			},
			keyframes: {
				'accordion-down': {
					from: {height: '0'},
					to: {height: 'var(--radix-accordion-content-height)'}
				},
				'accordion-up': {
					from: {height: 'var(--radix-accordion-content-height)'},
					to: {height: '0'}
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out'
			}
		}
	},
	plugins: [],
	safelist
}

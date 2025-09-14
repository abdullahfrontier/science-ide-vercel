import type {ThemeConfig} from 'antd'

// Convert HSL to RGB for Ant Design
const hslToRgb = (h: number, s: number, l: number): string => {
	s /= 100
	l /= 100
	const a = s * Math.min(l, 1 - l)
	const f = (n: number) => {
		const k = (n + h / 30) % 12
		const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
		return Math.round(255 * color)
	}
	return `rgb(${f(0)}, ${f(8)}, ${f(4)})`
}

// Earthy color palette matching the existing CSS variables
export const colors = {
	primary: hslToRgb(180, 30, 35), // Deep teal
	secondary: hslToRgb(40, 25, 88), // Warm beige
	accent: hslToRgb(45, 85, 65), // Mustard yellow
	background: hslToRgb(45, 23, 97), // Warm off-white
	foreground: hslToRgb(25, 25, 15), // Deep warm brown
	card: hslToRgb(45, 15, 99), // Pure cream
	border: hslToRgb(40, 20, 85), // Soft beige border
	muted: hslToRgb(40, 15, 92), // Light beige
	sage: hslToRgb(120, 15, 65), // Sage green
	warmGray: hslToRgb(25, 15, 45), // Improved warm gray (better contrast)
	mutedText: hslToRgb(25, 20, 50) // Better muted text color
}

export const antdTheme: ThemeConfig = {
	token: {
		// Primary colors
		colorPrimary: colors.primary,
		colorSuccess: colors.sage,
		colorWarning: colors.accent,
		colorError: hslToRgb(0, 70, 55), // Uses --destructive color token
		colorInfo: colors.primary,

		// Background colors
		colorBgBase: colors.background,
		colorBgContainer: colors.card,
		colorBgElevated: colors.card,
		colorBgLayout: colors.background,

		// Text colors
		colorText: colors.foreground,
		colorTextSecondary: colors.mutedText,
		colorTextTertiary: colors.warmGray,
		colorTextQuaternary: colors.muted,

		// Border colors
		colorBorder: colors.border,
		colorBorderSecondary: colors.muted,

		// Border radius
		borderRadius: 12,
		borderRadiusLG: 16,
		borderRadiusSM: 8,
		borderRadiusXS: 6,

		// Typography
		fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
		fontSize: 14,
		fontSizeHeading1: 32,
		fontSizeHeading2: 24,
		fontSizeHeading3: 20,
		fontSizeHeading4: 16,
		fontSizeHeading5: 14,
		fontSizeLG: 16,
		fontSizeSM: 13, // Increased from 12 for better readability
		fontSizeXL: 18,

		// Spacing
		padding: 16,
		paddingLG: 24,
		paddingSM: 12,
		paddingXL: 32,
		paddingXS: 8,

		// Animation
		motionDurationFast: '0.1s',
		motionDurationMid: '0.2s',
		motionDurationSlow: '0.3s',

		// Box shadow with earthy tones
		boxShadow: '0 1px 2px 0 rgba(139, 122, 89, 0.05), 0 1px 6px -1px rgba(139, 122, 89, 0.1), 0 2px 4px 0 rgba(139, 122, 89, 0.05)',
		boxShadowSecondary: '0 6px 16px 0 rgba(139, 122, 89, 0.08), 0 3px 6px -4px rgba(139, 122, 89, 0.12), 0 9px 28px 8px rgba(139, 122, 89, 0.05)'
	},
	components: {
		Button: {
			colorPrimary: colors.primary,
			algorithm: true,
			primaryShadow: '0 2px 0 rgba(139, 122, 89, 0.045)'
		},
		Input: {
			colorBgContainer: colors.card,
			activeBorderColor: colors.primary,
			hoverBorderColor: colors.primary
		},
		Card: {
			colorBgContainer: colors.card,
			colorBorderSecondary: colors.border
		},
		Layout: {
			colorBgBody: colors.background,
			colorBgContainer: colors.card,
			colorBgHeader: colors.card,
			colorBgTrigger: colors.muted
		},
		Menu: {
			colorBgContainer: colors.card,
			colorItemBg: 'transparent',
			colorItemBgSelected: colors.secondary,
			colorItemBgHover: colors.muted
		},
		Form: {
			labelColor: colors.foreground,
			colorError: hslToRgb(0, 70, 55) // Uses --destructive color token
		},
		Typography: {
			colorText: colors.foreground,
			colorTextHeading: colors.foreground
		},
		Timeline: {
			colorText: colors.foreground,
			colorTextDescription: colors.mutedText,
			dotBorderWidth: 2
		},
		Tabs: {
			colorBgContainer: colors.card,
			itemSelectedColor: colors.primary,
			itemHoverColor: colors.primary
		},
		Modal: {
			colorBgMask: 'rgba(139, 122, 89, 0.45)'
		}
	}
}

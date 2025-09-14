/**
 * STYLING HIERARCHY GUIDELINES
 *
 * This codebase follows a specific hierarchy for styling approaches:
 *
 * 1. **Design Tokens (CSS Custom Properties)** - HIGHEST PRIORITY
 *    - Use CSS variables defined in globals.css (--primary, --secondary, etc.)
 *    - Example: 'var(--primary)', 'var(--muted-foreground)'
 *    - Benefits: Theme-aware, consistent, easy to maintain
 *
 * 2. **TailwindCSS Classes** - LAYOUT AND UTILITIES
 *    - Use for layout, spacing, positioning, and utility classes
 *    - Example: 'flex', 'items-center', 'p-4', 'rounded-lg'
 *    - Benefits: Responsive, utility-first, consistent spacing
 *
 * 3. **Ant Design Theme Tokens** - COMPONENT-SPECIFIC STYLING
 *    - Use for Ant Design component customization via antd-theme.ts
 *    - Example: colors.primary, colors.mutedText
 *    - Benefits: Component-aware, design system integration
 *
 * 4. **STYLES Object (This File)** - REUSABLE PATTERNS
 *    - Use for commonly repeated styling patterns
 *    - Example: STYLES.card, STYLES.input
 *    - Benefits: DRY principle, consistent patterns
 *
 * 5. **Inline Styles** - LOWEST PRIORITY (Dynamic Values Only)
 *    - ONLY for dynamic/computed values that can't be predefined
 *    - Example: dynamic colors, calculated dimensions
 *    - Benefits: Dynamic behavior, runtime calculations
 *
 * NEVER USE:
 * - Hardcoded hex colors (#ffffff, #000000, etc.)
 * - Hardcoded RGB/RGBA values (rgb(255,255,255), rgba(0,0,0,0.5))
 * - Magic numbers for spacing or dimensions
 */

export const STYLES = {
	// Common form input styling
	input: 'mt-1 block w-full bg-background border border-input rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-ring sm:text-sm text-foreground placeholder:text-muted-foreground',

	// Textarea styling
	textarea: 'mt-1 block w-full bg-background border border-input rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-ring sm:text-sm text-foreground placeholder:text-muted-foreground min-h-[100px] resize-vertical',

	// Select dropdown styling
	select: 'mt-1 block w-full bg-background border border-input rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-ring sm:text-sm text-foreground',

	// Form label styling
	label: 'block text-sm font-medium text-foreground mb-1',

	// Card container styling
	card: 'bg-card rounded-lg p-6 shadow-sm border border-border',

	// Tile container styling
	tile: 'border rounded-lg border-border shadow-sm',

	// Error text styling
	error: 'text-sm text-red-600 mt-1',

	// Success text styling
	success: 'text-sm text-green-600 mt-1',

	// Loading spinner container
	loadingContainer: 'flex items-center justify-center p-4',

	// Modal backdrop
	modalBackdrop: 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50',

	// Modal content
	modalContent: 'bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6',

	// Form group spacing
	formGroup: 'mb-4',

	// Button base styles (to complement Button component)
	buttonBase: 'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background',

	// Content wrapper
	contentWrapper: 'max-w-4xl mx-auto px-4 sm:px-6 lg:px-8',

	// Page header
	pageHeader: 'border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60',

	// Navigation
	nav: 'flex items-center justify-between h-16 px-4',

	// Grid layouts
	gridCols2: 'grid grid-cols-1 md:grid-cols-2 gap-6',
	gridCols3: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6',

	// Flexbox utilities
	flexCenter: 'flex items-center justify-center',
	flexBetween: 'flex items-center justify-between',
	flexCol: 'flex flex-col',

	// Text utilities
	textMuted: 'text-muted-foreground',
	textSmall: 'text-sm',
	textLarge: 'text-lg',

	// Spacing utilities
	spacing: {
		xs: 'p-2',
		sm: 'p-4',
		md: 'p-6',
		lg: 'p-8',
		xl: 'p-12'
	},

	// Border radius utilities
	rounded: {
		sm: 'rounded-sm',
		md: 'rounded-md',
		lg: 'rounded-lg',
		xl: 'rounded-xl'
	},

	// Chat message styling patterns
	chatMessage: {
		bubble: 'p-3 rounded-xl shadow-sm max-w-full break-words',
		userBubble: 'bg-secondary text-secondary-foreground',
		assistantBubble: 'bg-card border border-border text-foreground',
		timestamp: 'text-xs text-muted-foreground font-medium uppercase tracking-wide'
	},

	// Landing page patterns
	landingCard: {
		base: 'bg-card rounded-lg border border-border shadow-sm',
		selected: 'bg-blue-50 border-blue-200',
		content: 'p-6 space-y-4'
	},

	// Timeline patterns
	timeline: {
		item: 'border-l-2 border-border pl-4 pb-4 last:pb-0',
		dot: 'w-3 h-3 rounded-full bg-primary border-2 border-background -ml-2 mt-1',
		timestamp: 'text-xs text-muted-foreground'
	},

	// Common shadow patterns (using earthy colors)
	shadows: {
		sm: 'shadow-sm', // Uses design system shadows
		md: 'shadow-md',
		lg: 'shadow-lg',
		card: 'shadow-sm border border-border',
		elevated: 'shadow-lg border border-border'
	},

	// Avatar patterns
	avatar: {
		user: 'bg-muted text-muted-foreground',
		assistant: 'bg-primary text-primary-foreground',
		small: 'w-6 h-6 text-xs',
		medium: 'w-8 h-8 text-sm',
		large: 'w-12 h-12 text-base'
	}
} as const

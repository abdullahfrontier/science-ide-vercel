import React, {ReactNode} from 'react'
import {Button as AntButton, ButtonProps as AntButtonProps} from 'antd'

interface ButtonProps extends Omit<AntButtonProps, 'type' | 'size' | 'variant'> {
	variant?: 'default' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'accent'
	size?: 'sm' | 'md' | 'lg'
	children: ReactNode
	className?: string
	disabled?: boolean
	accentColor?: string
}

// Map custom variants to Ant Design types
const getAntType = (variant: string): AntButtonProps['type'] => {
	switch (variant) {
		case 'default':
			return 'primary'
		case 'secondary':
			return 'default'
		case 'outline':
			return 'default'
		case 'ghost':
			return 'text'
		case 'destructive':
			return 'primary'
		case 'accent':
			return 'primary'
		default:
			return 'primary'
	}
}

// Map custom sizes to Ant Design sizes
const getAntSize = (size: string): AntButtonProps['size'] => {
	switch (size) {
		case 'sm':
			return 'small'
		case 'md':
			return 'middle'
		case 'lg':
			return 'large'
		default:
			return 'middle'
	}
}

export const Button: React.FC<ButtonProps> = ({variant = 'default', size = 'md', children, className, disabled, accentColor, ...allProps}) => {
	const antType = getAntType(variant)
	const antSize = getAntSize(size)

	// Handle special styling for variants
	let buttonStyle: React.CSSProperties = {}

	if (variant === 'destructive') {
		buttonStyle = {
			backgroundColor: 'hsl(var(--destructive))',
			borderColor: 'hsl(var(--destructive))',
			color: 'hsl(var(--destructive-foreground))'
		}
	} else if (variant === 'accent') {
		buttonStyle = {
			backgroundColor: 'var(--accent)',
			borderColor: 'var(--accent)',
			color: 'var(--accent-foreground)'
		}
	} else if (variant === 'outline') {
		buttonStyle = {
			borderColor: 'var(--border)',
			color: 'var(--foreground)',
			backgroundColor: 'transparent'
		}
	} else if (variant === 'secondary') {
		buttonStyle = {
			backgroundColor: 'var(--secondary)',
			borderColor: 'var(--secondary)',
			color: 'var(--secondary-foreground)'
		}
	}

	// Handle accent color override for backward compatibility
	if (accentColor && variant === 'default') {
		buttonStyle = {
			backgroundColor: accentColor,
			borderColor: accentColor,
			color: 'white'
		}
	}

	return (
		<AntButton type={antType} size={antSize} disabled={disabled} className={className} style={buttonStyle} {...allProps}>
			{children}
		</AntButton>
	)
}

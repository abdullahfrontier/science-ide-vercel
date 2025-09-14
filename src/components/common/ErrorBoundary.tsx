import React from 'react'

interface ErrorBoundaryProps {
	children: React.ReactNode
}

interface ErrorBoundaryState {
	hasError: boolean
	error?: Error
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
	constructor(props: ErrorBoundaryProps) {
		super(props)
		this.state = {hasError: false}
	}

	static getDerivedStateFromError(error: Error): ErrorBoundaryState {
		return {hasError: true, error}
	}

	componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
		console.error('Error boundary caught an error:', error, errorInfo)
	}

	render() {
		if (this.state.hasError) {
			return (
				<div className="min-h-screen bg-background flex items-center justify-center px-4">
					<div className="max-w-md w-full text-center">
						<div className="bg-card rounded-lg border border-border shadow-lg p-8">
							<h1 className="text-2xl font-bold text-foreground mb-4">Something went wrong</h1>
							<p className="text-muted-foreground mb-6">There was an error loading the application. Please try refreshing the page.</p>
							<button onClick={() => window.location.reload()} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
								Refresh Page
							</button>
						</div>
					</div>
				</div>
			)
		}

		return this.props.children
	}
}

import { Component, type ErrorInfo, type ReactNode } from "react";

interface ErrorBoundaryProps {
	children: ReactNode;
}

interface ErrorBoundaryState {
	error: Error | null;
}

/**
 * Keeps a rendering error on one page from blanking the whole app. The
 * layout and navigation stay mounted; the failed page shows the error and
 * a retry button.
 */
export class ErrorBoundary extends Component<
	ErrorBoundaryProps,
	ErrorBoundaryState
> {
	state: ErrorBoundaryState = { error: null };

	static getDerivedStateFromError(error: Error): ErrorBoundaryState {
		return { error };
	}

	componentDidCatch(error: Error, info: ErrorInfo) {
		console.error("Unhandled render error", error, info.componentStack);
	}

	private reset = () => {
		this.setState({ error: null });
	};

	render() {
		if (this.state.error) {
			return (
				<div
					role="alert"
					className="m-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-900 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-100"
				>
					<p className="font-medium">Something went wrong on this page.</p>
					<p className="mt-1 break-words font-mono text-xs opacity-80">
						{this.state.error.message}
					</p>
					<button
						type="button"
						onClick={this.reset}
						className="mt-3 rounded-md border border-red-300 px-3 py-1 text-xs font-medium hover:bg-red-100 dark:border-red-700 dark:hover:bg-red-900/40"
					>
						Try again
					</button>
				</div>
			);
		}
		return this.props.children;
	}
}

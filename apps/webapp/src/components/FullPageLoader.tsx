type FullPageLoaderProps = {
	label?: string;
};

export function FullPageLoader({ label = "Loading" }: FullPageLoaderProps) {
	return (
		<div
			className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background text-foreground"
			// biome-ignore lint/a11y/useSemanticElements: <explanation>
			role="status"
			aria-live="polite"
			aria-label={label}
		>
			<div className="size-12 animate-spin rounded-full border-4 border-muted border-t-primary" />
			<p className="text-sm text-muted-foreground">{label}...</p>
		</div>
	);
}

type FullPageLoaderProps = {
	label?: string;
};

export function FullPageLoader({ label = "Loading" }: FullPageLoaderProps) {
	return (
		<div
			className="grid min-h-screen place-items-center overflow-hidden bg-[radial-gradient(circle_at_50%_22%,rgba(148,163,184,0.16),transparent_34%),linear-gradient(180deg,#f8fafc_0%,#f1f5f9_100%)] p-7 text-slate-900"
			// biome-ignore lint/a11y/useSemanticElements: <explanation>
			role="status"
			aria-live="polite"
			aria-label={label}
		>
			<div className="grid size-full max-h-80 max-w-80 place-items-center p-8">
				<div className="flex size-full flex-col items-center justify-center gap-6">
					<img
						className="size-44 object-contain drop-shadow-[0_10px_22px_rgba(15,23,42,0.08)]"
						src="/splash-icon.png"
						alt="Hub Core"
					/>
					<div className="h-1.5 w-full max-w-36 overflow-hidden rounded-full bg-slate-300/80">
						<div className="h-full w-[30%] animate-[hub-splash-progress_1.15s_ease-in-out_infinite] rounded-full bg-slate-900" />
					</div>
					<span className="sr-only">{label}...</span>
				</div>
			</div>
		</div>
	);
}

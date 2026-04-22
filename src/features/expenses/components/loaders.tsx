import { SkeletonBase } from "#/components/ui/custom-skeleton";

function ExpenseFieldSkeleton({
	labelWidth = "w-24",
}: {
	labelWidth?: string;
}) {
	return (
		<div className="flex flex-col gap-2">
			<SkeletonBase className={`h-3 ${labelWidth}`} />
			<SkeletonBase className="h-10 w-full rounded-lg" />
		</div>
	);
}

function ExpenseLineRowSkeleton({ dimmed }: { dimmed?: boolean }) {
	return (
		<div
			className={`grid grid-cols-[30%_1fr_140px_56px] gap-4 border-b border-border px-4 py-3 ${
				dimmed ? "opacity-80" : ""
			}`}
		>
			<SkeletonBase className="h-10 w-full rounded-lg" />
			<SkeletonBase className="h-10 w-full rounded-lg" />
			<SkeletonBase className="h-10 w-full rounded-lg" />
			<div className="flex items-center justify-center">
				<SkeletonBase className="size-9 rounded-md" />
			</div>
		</div>
	);
}

export function ExpenseFormPending() {
	return (
		<div className="min-h-[calc(100vh-6rem)] md:min-h-[calc(100vh-7rem)] flex flex-col max-w-5xl">
			<div className="flex-1 y-spacing">
				<SkeletonBase className="h-5 w-20" />
				<div className="space-y-2">
					<SkeletonBase className="h-8 w-44" />
					<SkeletonBase className="h-4 w-80 max-w-full" />
				</div>

				<div className="rounded-md bg-card p-4 grid gap-4 md:grid-cols-3">
					<ExpenseFieldSkeleton labelWidth="w-24" />
					<ExpenseFieldSkeleton labelWidth="w-28" />
					<div />
					<ExpenseFieldSkeleton labelWidth="w-[6.5rem]" />
					<ExpenseFieldSkeleton labelWidth="w-24" />
					<ExpenseFieldSkeleton labelWidth="w-24" />
					<ExpenseFieldSkeleton labelWidth="w-[7.5rem]" />
					<ExpenseFieldSkeleton labelWidth="w-16" />
					<ExpenseFieldSkeleton labelWidth="w-20" />
				</div>

				<section className="rounded-md bg-card p-4 shadow-sm">
					<div className="mb-4 flex justify-end gap-2">
						<SkeletonBase className="h-10 w-24 rounded-md" />
						<SkeletonBase className="h-10 w-24 rounded-md" />
					</div>

					<div className="overflow-hidden rounded-md border border-border">
						<div className="grid grid-cols-[30%_1fr_140px_56px] gap-4 border-b border-border px-4 py-3">
							<SkeletonBase className="h-3 w-16" />
							<SkeletonBase className="h-3 w-20" />
							<SkeletonBase className="h-3 w-14" />
							<SkeletonBase className="h-3 w-6" />
						</div>
						<ExpenseLineRowSkeleton />
						<ExpenseLineRowSkeleton dimmed />
						<ExpenseLineRowSkeleton dimmed />
						<div className="grid grid-cols-[30%_1fr_140px_56px] gap-4 px-4 py-3">
							<div className="col-span-2 flex items-center">
								<SkeletonBase className="h-4 w-12" />
							</div>
							<div className="flex items-center">
								<SkeletonBase className="h-4 w-20" />
							</div>
							<div />
						</div>
					</div>
				</section>
			</div>

			<div className="flex justify-end py-3 gap-2">
				<SkeletonBase className="h-10 w-24 rounded-md" />
				<SkeletonBase className="h-10 w-32 rounded-md" />
			</div>
		</div>
	);
}

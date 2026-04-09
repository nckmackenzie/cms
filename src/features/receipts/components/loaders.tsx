import { SkeletonBase } from "#/components/ui/custom-skeleton";
import { cn } from "#/lib/utils";

type FieldSkeletonProps = {
	className?: string;
	labelClassName?: string;
	inputClassName?: string;
};

function FieldSkeleton({
	className,
	labelClassName,
	inputClassName,
}: FieldSkeletonProps) {
	return (
		<div className={cn("flex flex-col gap-2", className)}>
			<SkeletonBase className={cn("h-3 w-24", labelClassName)} />
			<SkeletonBase className={cn("h-10 w-full rounded-lg", inputClassName)} />
		</div>
	);
}

function ReceiptLineSkeleton({ dense }: { dense?: boolean }) {
	return (
		<div
			className={cn(
				"rounded-xl border border-border/80 bg-popover/80 px-3 py-3",
				dense && "opacity-80",
			)}
		>
			<div className="flex items-center gap-3">
				<SkeletonBase className="size-7 rounded-full" />
				<div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
					<SkeletonBase className="h-5 w-20 rounded-full" />
					<SkeletonBase className="h-3 w-24" />
					<SkeletonBase className="h-3 w-40" />
				</div>
				<div className="flex items-center gap-2">
					<SkeletonBase className="h-5 w-16" />
					<SkeletonBase className="size-7 rounded-md" />
				</div>
			</div>
			<div className="mt-2 flex items-center gap-2">
				<SkeletonBase className="h-3 w-3 rounded-sm" />
				<SkeletonBase className="h-3 w-48" />
			</div>
		</div>
	);
}

export function ReceiptsFormPending() {
	return (
		<div className="max-w-7xl form-spacing">
			<div className="flex justify-end gap-2">
				<SkeletonBase className="h-10 w-32 rounded-md" />
				<SkeletonBase className="h-10 w-24 rounded-md" />
			</div>

			<div className="bg-popover p-4 grid md:grid-cols-2 gap-4 rounded-xl shadow-sm">
				<FieldSkeleton labelClassName="w-20" />
				<FieldSkeleton labelClassName="w-32" />
				<div className="grid md:grid-cols-2 gap-4">
					<FieldSkeleton labelClassName="w-28" />
					<FieldSkeleton labelClassName="w-16" />
				</div>
				<FieldSkeleton labelClassName="w-20" />
			</div>

			<div className="bg-popover p-4 rounded-xl shadow-sm form-spacing">
				<div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
					<FieldSkeleton labelClassName="w-20" />
					<FieldSkeleton labelClassName="w-24" />
					<FieldSkeleton labelClassName="w-24" />
					<FieldSkeleton labelClassName="w-24" />
					<FieldSkeleton labelClassName="w-28" className="lg:col-span-2" />
				</div>
				<div className="flex justify-end">
					<SkeletonBase className="h-10 w-28 rounded-md" />
				</div>
			</div>

			<div className="space-y-2">
				<ReceiptLineSkeleton />
				<ReceiptLineSkeleton dense />
				<ReceiptLineSkeleton dense />
			</div>
		</div>
	);
}

import { AlertTriangleIcon, PlusIcon, RefreshCwIcon } from "lucide-react";
import { type PropsWithChildren, Suspense } from "react";
import type { FallbackProps } from "react-error-boundary";
import { ErrorBoundary } from "react-error-boundary";
import { Button } from "#/components/ui/button";
import { SkeletonBase } from "#/components/ui/custom-skeleton";
import { TableSkeleton } from "#/components/ui/loaders";
import { PageHeader } from "#/components/ui/page-header";
import { Search } from "#/components/ui/search";
import { cn } from "#/lib/utils";

type BaseProps = {
	className?: string;
	pageTitle: string;
	pageDescription?: string;
	searchPlaceholder?: string;
	extraActionButtons?: React.ReactNode;
	onSearch?: (value: string) => void;
	loadingComponent?: React.ReactNode;
	defaultSearchValue?: string;
	customFilters?: React.ReactNode;
	filterClassName?: string;
};

type PropsWithButton = BaseProps & {
	hasNewButton: true;
	newButtonAction: () => void;
	buttonText?: string;
	buttonIcon?: React.ReactNode;
};

type PropsWithoutButton = BaseProps & {
	hasNewButton?: false;
	newButtonAction?: never;
	buttonText?: never;
	buttonIcon?: never;
};

type Props = PropsWithButton | PropsWithoutButton;
function ErrorComponent({ error, resetErrorBoundary }: FallbackProps) {
	return (
		<div className="flex flex-col items-center justify-center gap-4 py-14 px-6 text-center">
			<div className="flex items-center justify-center size-10 rounded-xl bg-danger text-danger-foreground">
				<AlertTriangleIcon size={18} strokeWidth={1.8} />
			</div>

			<div className="flex flex-col gap-1">
				<p className="font-display text-sm font-semibold text-foreground">
					Something went wrong
				</p>
				<p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
					{error instanceof Error
						? error?.message
						: "An unexpected error occurred."}
				</p>
			</div>

			<button
				onClick={resetErrorBoundary}
				type="button"
				className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md border border-border text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
			>
				<RefreshCwIcon size={12} strokeWidth={2} />
				Try again
			</button>
		</div>
	);
}

export function BasePageComponent({
	className,
	pageTitle,
	pageDescription,
	hasNewButton,
	newButtonAction,
	searchPlaceholder = "Search...",
	extraActionButtons,
	onSearch,
	children,
	buttonIcon,
	buttonText = "Create New",
	loadingComponent,
	defaultSearchValue,
	customFilters,
	filterClassName,
}: PropsWithChildren<Props>) {
	return (
		<div className={cn("y-spacing", className)}>
			<PageHeader
				title={pageTitle}
				description={pageDescription}
				content={
					<div className="flex flex-col sm:flex-row sm:items-center gap-2">
						{hasNewButton && (
							<Button variant="default" onClick={newButtonAction} size="xl">
								{buttonIcon ?? <PlusIcon />}
								{buttonText}
							</Button>
						)}
						{extraActionButtons}
					</div>
				}
			/>
			<div
				className={cn(
					"flex flex-col gap-y-2 md:gap-y-0 md:flex-row md:items-center md:justify-between",
					filterClassName,
				)}
			>
				{onSearch && (
					<Search
						placeholder={searchPlaceholder}
						onHandleSearch={onSearch}
						defaultValue={defaultSearchValue}
						className="bg-card"
					/>
				)}
				{/* <div className="flex flex-col sm:flex-row sm:items-center gap-2">
					{hasNewButton && (
						<Button variant="default" onClick={newButtonAction} size="xl">
							{buttonIcon ?? <PlusIcon />}
							{buttonText}
						</Button>
					)}
					{extraActionButtons}
				</div> */}
			</div>
			{customFilters}
			<Suspense>
				<ErrorBoundary
					fallbackRender={({ error, resetErrorBoundary }) => (
						<ErrorComponent
							error={error}
							resetErrorBoundary={resetErrorBoundary}
						/>
					)}
				>
					<Suspense fallback={loadingComponent ?? <TableSkeleton />}>
						{children}
					</Suspense>
				</ErrorBoundary>
			</Suspense>
		</div>
	);
}

type BasePageLoadingSkeletonProps = {
	pageTitle?: string;
	pageDescription?: string;
};

export const BasePageLoadingSkeleton = ({
	pageDescription,
	pageTitle,
}: BasePageLoadingSkeletonProps) => {
	return (
		<Wrapper className="space-y-6" size="full">
			<PageHeader
				title={pageTitle ?? "Loading..."}
				description={pageDescription ?? "Please wait while loading"}
			/>
			<SkeletonBase className="h-10 max-w-sm" />
			<TableSkeleton />
		</Wrapper>
	);
};

type WrapperProps = {
	children: React.ReactNode;
	size?: "xs" | "sm" | "md" | "lg" | "full";
	className?: string;
};

export function Wrapper({ children, size = "md", className }: WrapperProps) {
	return (
		<div
			className={cn(
				"p-4 md:px-6 bg-popover mx-auto rounded-md md:shadow-sm space-y-6 w-full",
				{
					"max-w-xl": size === "xs",
					"max-w-3xl": size === "sm",
					"max-w-4xl": size === "md",
					"max-w-5xl": size === "lg",
					"max-w-7xl mx-0": size === "full",
				},
				className,
			)}
		>
			{children}
		</div>
	);
}

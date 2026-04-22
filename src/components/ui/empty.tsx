import { cva, type VariantProps } from "class-variance-authority";
import { FileIcon, type LucideIcon, SearchIcon } from "lucide-react";
import { Button, type buttonVariants } from "#/components/ui/button";
import { cn } from "#/lib/utils";

function Empty({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="empty"
			className={cn(
				"flex w-full min-w-0 flex-1 flex-col items-center justify-center gap-4 rounded-xl border-dashed p-6 text-center text-balance",
				className,
			)}
			{...props}
		/>
	);
}

function EmptyHeader({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="empty-header"
			className={cn("flex max-w-sm flex-col items-center gap-2", className)}
			{...props}
		/>
	);
}

const emptyMediaVariants = cva(
	"mb-2 flex shrink-0 items-center justify-center [&_svg]:pointer-events-none [&_svg]:shrink-0",
	{
		variants: {
			variant: {
				default: "bg-transparent",
				icon: "flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground [&_svg:not([class*='size-'])]:size-4",
			},
		},
		defaultVariants: {
			variant: "default",
		},
	},
);

function EmptyMedia({
	className,
	variant = "default",
	...props
}: React.ComponentProps<"div"> & VariantProps<typeof emptyMediaVariants>) {
	return (
		<div
			data-slot="empty-icon"
			data-variant={variant}
			className={cn(emptyMediaVariants({ variant, className }))}
			{...props}
		/>
	);
}

function EmptyTitle({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="empty-title"
			className={cn("text-sm font-medium tracking-tight", className)}
			{...props}
		/>
	);
}

function EmptyDescription({ className, ...props }: React.ComponentProps<"p">) {
	return (
		<div
			data-slot="empty-description"
			className={cn(
				"text-sm/relaxed text-muted-foreground [&>a]:underline [&>a]:underline-offset-4 [&>a:hover]:text-primary",
				className,
			)}
			{...props}
		/>
	);
}

function EmptyContent({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="empty-content"
			className={cn(
				"flex w-full max-w-sm min-w-0 flex-col items-center gap-2.5 text-sm text-balance",
				className,
			)}
			{...props}
		/>
	);
}

export interface EmptyStateAction {
	label: string;
	onClick: () => void;
	icon?: LucideIcon;
	size?: VariantProps<typeof buttonVariants>["size"];
	variant?: VariantProps<typeof buttonVariants>["variant"];
}

type EmptyStateVariant = "default" | "search";

type EmptyStateProps = {
	icon?: LucideIcon;
	title: string;
	description?: string;
	action?: EmptyStateAction;
	secondaryAction?: EmptyStateAction;
	variant?: EmptyStateVariant;
	className?: string;
};

const VARIANT_ICON: Record<EmptyStateVariant, LucideIcon> = {
	default: FileIcon,
	search: SearchIcon,
};

function EmptyState({
	className,
	icon,
	variant = "default",
	title,
	description,
	action,
	secondaryAction,
}: EmptyStateProps) {
	const Icon = icon ?? VARIANT_ICON[variant];
	return (
		<Empty className={cn("border mx-auto w-fit", className)}>
			<EmptyHeader>
				<EmptyMedia className="bg-muted size-10" variant="icon">
					<Icon className="size-6 text-muted-foreground" strokeWidth={1.5} />
				</EmptyMedia>
				<EmptyTitle>{title}</EmptyTitle>
				{description && <EmptyDescription>{description}</EmptyDescription>}
			</EmptyHeader>
			{(action || secondaryAction) && (
				<EmptyContent className="flex-row justify-center gap-2">
					{action && (
						<Button
							size={action.size ?? "lg"}
							variant={action.variant ?? "default"}
							onClick={action.onClick}
						>
							{action.icon && <action.icon size={14} strokeWidth={2.2} />}
							{action.label}
						</Button>
					)}
					{secondaryAction && (
						<Button
							size={secondaryAction.size ?? "lg"}
							variant={secondaryAction.variant ?? "default"}
							onClick={secondaryAction.onClick}
						>
							{secondaryAction.icon && (
								<secondaryAction.icon size={14} strokeWidth={2.2} />
							)}
							{secondaryAction.label}
						</Button>
					)}
				</EmptyContent>
			)}
		</Empty>
	);
}

export {
	Empty,
	EmptyHeader,
	EmptyTitle,
	EmptyDescription,
	EmptyContent,
	EmptyMedia,
	EmptyState,
};

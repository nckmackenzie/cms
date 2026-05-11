import { Link, useRouter } from "@tanstack/react-router";
import type { VariantProps } from "class-variance-authority";
import { ArrowLeftIcon } from "lucide-react";
import type { Route } from "#/lib/constants";
import type { buttonVariants } from "@/components/ui/button";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function BackLink({
	children,
	className,
	variant = "link",
	size,
	href,
	removeLeftPadding = false,
}: {
	children: React.ReactNode;
	className?: string;
	variant?: VariantProps<typeof buttonVariants>["variant"];
	size?: VariantProps<typeof buttonVariants>["size"];
	href?: Route["to"];
	removeLeftPadding?: boolean;
}) {
	const router = useRouter();
	if (href) {
		return (
			<Button
				variant={variant}
				size={size || "sm"}
				type="button"
				className={cn(
					"[&_svg]:transition-transform [&:hover_svg.arrow]:-translate-x-0.5",
					removeLeftPadding ? "pl-0" : className,
				)}
				asChild
			>
				<Link to={href}>
					<ArrowLeftIcon className="arrow shrink-0" />
					{children}
				</Link>
			</Button>
		);
	}
	return (
		<Button
			variant={variant}
			size={size || "sm"}
			type="button"
			className={cn(
				"[&_svg]:transition-transform [&:hover_svg.arrow]:-translate-x-0.5",
				removeLeftPadding ? "pl-0" : className,
			)}
			onClick={() => router.history.back()}
		>
			<ArrowLeftIcon className="arrow shrink-0" />
			{children}
		</Button>
	);
}

export function ButtonLink({
	path,
	children,
	className,
	variant = "secondary",
	icon,
}: {
	path: Route["to"];
	children?: React.ReactNode;
	className?: string;
	variant?: VariantProps<typeof buttonVariants>["variant"];
	icon?: React.ReactNode;
}) {
	return (
		<Button variant={variant} asChild className={className} size="lg">
			<Link to={path}>
				{icon}
				{children || "Create"}
			</Link>
		</Button>
	);
}

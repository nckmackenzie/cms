import { Link } from "@tanstack/react-router";
import type { VariantProps } from "class-variance-authority";
import { ArrowLeftIcon } from "lucide-react";
import type { Route } from "#/lib/constants";
import type { buttonVariants } from "@/components/ui/button";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function BackLink({
	children,
	className,
	variant = "outline",
	size,
	href,
}: {
	children: React.ReactNode;
	className?: string;
	variant?: VariantProps<typeof buttonVariants>["variant"];
	size?: VariantProps<typeof buttonVariants>["size"];
	href?: Route["to"];
}) {
	return (
		<Button
			variant={variant}
			size={size || "sm"}
			className={cn("", className)}
			asChild
		>
			<Link to={href ?? ".."}>
				<ArrowLeftIcon />
				{children}
			</Link>
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

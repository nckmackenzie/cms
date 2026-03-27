import { type ComponentProps, type ReactNode, useTransition } from "react";
import { toast } from "sonner";
import type { Result } from "#/lib/result";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { LoadingSwap } from "@/components/ui/loading-swap";
import { cn } from "@/lib/utils";

export function ActionButton({
	action,
	requireAreYouSure = false,
	areYouSureDescription = "This action cannot be undone.",
	isDestructive = true,
	...props
}: ComponentProps<typeof Button> & {
	action: () => Promise<Result<undefined>>;
	requireAreYouSure?: boolean;
	isDestructive?: boolean;
	areYouSureDescription?: ReactNode;
}) {
	const [isLoading, startTransition] = useTransition();

	function performAction() {
		startTransition(async () => {
			try {
				const data = await action();
				if (!data.success) {
					toast.error("Error", { description: data.error.message });
					return;
				}
				toast.success("Action completed successfully!");
			} catch (error) {
				toast.error("Error", {
					description:
						error instanceof Error
							? error.message
							: "An unexpected error occurred",
				});
			}
		});
	}
	if (requireAreYouSure) {
		return (
			<AlertDialog open={isLoading ? true : undefined}>
				<AlertDialogTrigger asChild>
					<Button {...props} />
				</AlertDialogTrigger>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Are you sure?</AlertDialogTitle>
						<AlertDialogDescription>
							{areYouSureDescription}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>{" "}
						<AlertDialogAction
							disabled={isLoading}
							onClick={performAction}
							className={cn(
								"",
								isDestructive ? "bg-red-500 hover:bg-red-600" : "",
							)}
						>
							<LoadingSwap isLoading={isLoading}>Yes</LoadingSwap>
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		);
	}

	return (
		<Button
			{...props}
			disabled={props.disabled ?? isLoading}
			onClick={(e) => {
				performAction();
				props.onClick?.(e);
			}}
		>
			<LoadingSwap
				isLoading={isLoading}
				className="inline-flex items-center gap-2"
			>
				{props.children}
			</LoadingSwap>
		</Button>
	);
}

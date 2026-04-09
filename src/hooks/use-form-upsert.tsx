import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import type { Route } from "#/lib/constants";
import type { AppError, Result } from "#/lib/result";

interface UseFormMutationOptions<
	TData extends { id?: string },
	TResult = void,
> {
	upsertFn: (data: TData) => Promise<Result<TResult>>;
	entityName: string;
	navigateTo?: Route["to"];
	queryKey: string[];
	successMessage?: {
		create?: string;
		update?: string;
	};
	onSuccessCallback?: (result: TResult, isEdit: boolean) => void;
	onErrorCallback?: (error: AppError, isEdit: boolean) => void;
	displaySuccessToast?: boolean;
	onReset?: () => void;
}

export function useFormUpsert<TData extends { id?: string }, TResult = void>({
	upsertFn,
	entityName,
	navigateTo,
	queryKey,
	successMessage,
	onSuccessCallback,
	displaySuccessToast = true,
	onErrorCallback,
	onReset,
}: UseFormMutationOptions<TData, TResult>) {
	const queryClient = useQueryClient();
	const navigate = useNavigate();

	return useMutation({
		mutationFn: async (data: TData) => {
			return await upsertFn(data);
		},
		onError: (error) => {
			console.error(":", error);
			toast.error("Something went wrong", {
				description: "Unexpected error occured!",
			});
		},
		onSuccess: (result, variables) => {
			const isEdit = !!variables.id;

			if (!result.success) {
				onErrorCallback?.(result.error, isEdit);
				toast.error("Something went wrong", {
					description: (
						<p className="text-xs text-muted-foreground">
							{result.error.message}
						</p>
					),
				});
				if (result.error.type === "AuthenticationError") {
					toast.error("Unauthenticated request!", {
						description: (
							<p className="text-xs text-muted-foreground">
								You need to be logged in to perform this action!
							</p>
						),
					});
					navigate({ to: "/login" });
					return;
				}
				toast.error("Something went wrong", {
					description: (
						<p className="text-xs text-muted-foreground">
							{result.error.message}
						</p>
					),
				});
				return;
			}

			const action = isEdit ? "updated" : "created";
			const defaultMessage = `${entityName} has been ${action} successfully.`;
			const message = isEdit
				? successMessage?.update || defaultMessage
				: successMessage?.create || defaultMessage;
			if (displaySuccessToast) {
				toast.success("Success", {
					description: (
						<p className="text-xs text-muted-foreground">{message}</p>
					),
				});
			}

			onReset?.();

			queryClient.invalidateQueries({ queryKey });
			onSuccessCallback?.(result.data, isEdit);

			if (navigateTo) {
				setTimeout(() => {
					navigate({ to: navigateTo });
				}, 0);
			}
		},
	});
}

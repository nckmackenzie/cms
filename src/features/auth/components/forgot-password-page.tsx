import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { KeySquareIcon } from "lucide-react";
import { toast } from "sonner";
import { requestPasswordResetFn } from "#/features/auth/services/auth.api";
import {
	type ForgotPasswordFormSchema,
	forgotPasswordFormSchema,
} from "#/features/auth/services/schema";
import { useAppForm } from "#/hooks/form";
import { Authed } from "./authed";

export function ForgotPasswordPage({
	congregations,
}: {
	congregations: Array<{ label: string; value: string }>;
}) {
	const action = useServerFn(requestPasswordResetFn);
	const { isPending, mutate } = useMutation({
		mutationFn: (data: ForgotPasswordFormSchema) => action({ data }),
		onSuccess: (result) => {
			if (result.success) {
				toast.success("Request received", {
					description: result.data.message,
				});
				return;
			}

			toast.error(result.error.message);
		},
		onError: (error) => {
			toast.error(error.message);
		},
	});

	const form = useAppForm({
		defaultValues: {
			username: "",
			congregationId: "",
		},
		validators: {
			onSubmit: forgotPasswordFormSchema,
		},
		onSubmit: ({ value }) => {
			mutate(value);
		},
	});

	return (
		<Authed
			title="Forgot Password"
			description="Enter your username and congregation. If the account can be reset, we will send an SMS code to the registered phone."
		>
			<form
				onSubmit={(e) => {
					e.preventDefault();
					form.handleSubmit();
				}}
				className="form-spacing"
			>
				<form.AppField name="congregationId">
					{(field) => (
						<field.Select
							placeholder="Select your congregation"
							label="Congregation"
							values={congregations}
						/>
					)}
				</form.AppField>
				<form.AppField name="username">
					{(field) => (
						<field.TextField label="Username" placeholder="eg jdoe" />
					)}
				</form.AppField>
				<form.AppForm>
					<form.SubmitButton
						icon={<KeySquareIcon />}
						buttonText="Send Reset Code"
						className="w-full flex"
						isLoading={isPending}
					/>
				</form.AppForm>
			</form>
		</Authed>
	);
}

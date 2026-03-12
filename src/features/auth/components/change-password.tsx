import { useMutation } from "@tanstack/react-query";
import { getRouteApi, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
	KeyRoundIcon,
	MessageSquareMoreIcon,
	RefreshCwIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "#/components/ui/button";
import { FieldDescription, FieldGroup, FieldSet } from "#/components/ui/field";
import {
	changePasswordFn,
	resendPasswordResetCodeFn,
} from "#/features/auth/services/auth.api";
import { useAppForm } from "#/hooks/form";
import {
	type ChangePasswordFormSchema,
	changePasswordFormSchema,
} from "../services/schema";
import { Authed } from "./authed";

export function ChangePassword() {
	const { challenge } = getRouteApi("/(auth)/change-password").useLoaderData();
	const action = useServerFn(changePasswordFn);
	const resendCode = useServerFn(resendPasswordResetCodeFn);
	const navigate = useNavigate({ from: "/change-password" });
	const { mutate, isPending } = useMutation({
		mutationFn: (data: ChangePasswordFormSchema) => action({ data }),
		onSuccess: (result) => {
			if (result.success) {
				toast.success("Success", {
					description: (
						<p className="text-xs text-muted-foreground">
							Your password has been changed. Login to proceed.
						</p>
					),
				});
				form.reset();
				navigate({ to: "/login", replace: true });
				return;
			}

			toast.error(result.error.message);
		},
		onError: (error) => {
			toast.error(error.message);
		},
	});

	const { mutate: resendMutate, isPending: isResending } = useMutation({
		mutationFn: () => resendCode(),
		onSuccess: (result) => {
			if (result.success) {
				toast.success("Code sent", {
					description: (
						<p className="text-xs text-muted-foreground">
							A new verification code was sent to {result.data.maskedPhone}.
						</p>
					),
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
			otpCode: "",
			password: "",
			confirmPassword: "",
		},
		validators: {
			onSubmit: changePasswordFormSchema,
		},
		onSubmit: ({ value }) => {
			mutate(value);
		},
	});

	return (
		<Authed
			title="Change Password"
			description="Verify the SMS code on file before setting your permanent password."
		>
			<form
				onSubmit={(e) => {
					e.preventDefault();
					form.handleSubmit();
				}}
			>
				<FieldGroup>
					<div className="rounded-2xl border border-border/70 bg-muted/30 p-4">
						<div className="flex items-start gap-3">
							<div className="mt-0.5 rounded-full bg-background p-2 shadow-sm">
								<MessageSquareMoreIcon className="size-4" aria-hidden />
							</div>
							<div className="space-y-1">
								<p className="text-sm font-medium text-foreground">
									Code sent to {challenge.maskedPhone}
								</p>
								<FieldDescription className="text-xs">
									Enter the 6-digit code from SMS. The current code expires in
									10 minutes.
								</FieldDescription>
							</div>
						</div>
					</div>
					<FieldSet>
						<form.AppField name="otpCode">
							{(field) => (
								<field.TextField
									label="Verification Code"
									placeholder="123456"
									inputMode="numeric"
									maxLength={6}
									autoComplete="one-time-code"
									helperText="Use the code sent to your registered phone number."
								/>
							)}
						</form.AppField>
						<form.AppField name="password">
							{(field) => (
								<field.PasswordTextField
									label="New Password"
									placeholder="******"
								/>
							)}
						</form.AppField>
						<form.AppField name="confirmPassword">
							{(field) => (
								<field.PasswordTextField
									label="Confirm Password"
									placeholder="******"
								/>
							)}
						</form.AppField>
					</FieldSet>
					<div className="flex flex-col gap-3 sm:flex-row">
						<form.AppForm>
							<form.SubmitButton
								isLoading={isPending}
								className="w-full sm:flex-1"
								buttonText="Change Password"
								icon={<KeyRoundIcon aria-hidden />}
							/>
						</form.AppForm>
						<Button
							type="button"
							variant="outline"
							className="w-full sm:w-auto"
							disabled={isResending}
							onClick={() => resendMutate()}
							size="xl"
						>
							<RefreshCwIcon
								className={isResending ? "animate-spin" : ""}
								aria-hidden
							/>
							Resend Code
						</Button>
					</div>
				</FieldGroup>
			</form>
		</Authed>
	);
}

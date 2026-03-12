import { useMutation } from "@tanstack/react-query";
import { getRouteApi, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { LogInIcon } from "lucide-react";
import { toast } from "sonner";
import { loginFn } from "#/features/auth/services/auth.api";
import {
	type LoginFormSchema,
	loginFormSchema,
} from "#/features/auth/services/schema";
import { useAppForm } from "#/hooks/form";
import { Authed } from "./authed";

export function LoginPage() {
	const { congregations } = getRouteApi("/(auth)/login").useLoaderData();
	const action = useServerFn(loginFn);
	const navigate = useNavigate({ from: "/login" });
	const { isPending, mutate } = useMutation({
		mutationFn: (data: LoginFormSchema) => action({ data }),
		onSuccess: (result) => {
			if (result.success) {
				form.reset();
				navigate({ to: "/finance/dashboard", replace: true });
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
			password: "",
			congregationId: "",
		},
		validators: {
			onSubmit: loginFormSchema,
		},
		onSubmit: ({ value }) => {
			mutate(value);
		},
	});

	return (
		<Authed
			title="Login"
			description="Sign in to your congregation portal. First-time accounts will continue with an SMS code."
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
				<div className="flex items-center gap-2.5 my-0.5">
					<div className="flex-1 h-px bg-border" />
					<span className="text-[0.63rem] text-muted-foreground font-medium uppercase tracking-wider">
						your credentials
					</span>
					<div className="flex-1 h-px bg-border" />
				</div>
				<form.AppField name="username">
					{(field) => (
						<field.TextField label="Username" placeholder="eg jdoe" />
					)}
				</form.AppField>
				<form.AppField name="password">
					{(field) => (
						<field.PasswordTextField label="Password" placeholder="******" />
					)}
				</form.AppField>
				<form.AppForm>
					<form.SubmitButton
						icon={<LogInIcon />}
						buttonText="Login"
						className="w-full flex"
						isLoading={isPending}
					/>
				</form.AppForm>
			</form>
		</Authed>
	);
}

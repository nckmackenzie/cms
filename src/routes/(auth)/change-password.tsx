import { createFileRoute } from "@tanstack/react-router";
import { ChangePassword } from "#/features/auth/components/change-password";
import { getPasswordResetChallengeFn } from "#/features/auth/services/auth.api";
import { seo } from "#/lib/seo";

export const Route = createFileRoute("/(auth)/change-password")({
	component: ChangePassword,
	head: () => ({ meta: [...seo({ title: "Change Password" })] }),
	loader: async () => ({
		challenge: await getPasswordResetChallengeFn(),
	}),
});

import { createFileRoute } from "@tanstack/react-router";
import { ForgotPasswordPage } from "#/features/auth/components/forgot-password-page";
import { seo } from "#/lib/seo";
import { getCongregations } from "./login";

export const Route = createFileRoute("/(auth)/forgot-password")({
	component: ForgotPasswordRoute,
	head: () => ({ meta: [...seo({ title: "Forgot Password" })] }),
	loader: async () => ({
		congregations: await getCongregations(),
	}),
});

function ForgotPasswordRoute() {
	const { congregations } = Route.useLoaderData();

	return <ForgotPasswordPage congregations={congregations} />;
}

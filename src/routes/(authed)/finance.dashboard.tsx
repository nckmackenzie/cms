import { createFileRoute } from "@tanstack/react-router";
import { seo } from "#/lib/seo";

export const Route = createFileRoute("/(authed)/finance/dashboard")({
	component: RouteComponent,
	head: () => ({ meta: [...seo({ title: "Finance Dashboard" })] }),
});

function RouteComponent() {
	return <div>Hello "/finance/finance/dashboard"!</div>;
}

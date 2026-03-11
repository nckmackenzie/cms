import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/(authed)/finance/dashboard")({
	component: RouteComponent,
});

function RouteComponent() {
	return <div>Hello "/finance/finance/dashboard"!</div>;
}

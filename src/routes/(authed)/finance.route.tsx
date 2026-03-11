import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/(authed)/finance")({
	component: RouteComponent,
});

function RouteComponent() {
	return <Outlet />;
}

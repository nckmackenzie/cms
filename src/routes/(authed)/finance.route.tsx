import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/(authed)/finance")({
	component: RouteComponent,
	staticData: {
		breadcrumb: "Finance",
	},
});

function RouteComponent() {
	return <Outlet />;
}

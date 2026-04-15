import { createFileRoute, Outlet } from "@tanstack/react-router";
import {
	GlobalNotFound,
	RouteErrorComponent,
} from "#/components/ui/route-components";

export const Route = createFileRoute("/(authed)/finance")({
	component: RouteComponent,
	staticData: {
		breadcrumb: "Finance",
	},
	errorComponent: ({ error, reset }) => (
		<RouteErrorComponent error={error} reset={reset} />
	),
	notFoundComponent: GlobalNotFound,
});

function RouteComponent() {
	return <Outlet />;
}

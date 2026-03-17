import { createFileRoute } from "@tanstack/react-router";
import { Button } from "#/components/ui/button";
import { RouteErrorComponent } from "#/components/ui/route-components";
import { useSheet } from "#/integrations/providers/sheet-provider";
import { seo } from "#/lib/seo";

export const Route = createFileRoute("/(authed)/finance/dashboard")({
	component: RouteComponent,
	head: () => ({ meta: [...seo({ title: "Finance Dashboard" })] }),
	errorComponent: RouteErrorComponent,
});

function RouteComponent() {
	const { setOpen } = useSheet();
	return (
		<div>
			<Button
				variant="default"
				onClick={() =>
					setOpen(<p></p>, {
						title: "Edit Expense",
						description: "Update the expense details.",
					})
				}
			>
				Finance Dashboard
			</Button>
		</div>
	);
}

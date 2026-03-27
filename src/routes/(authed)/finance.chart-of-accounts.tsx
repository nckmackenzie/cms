import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { BasePageComponent } from "#/components/ui/base-page";
import { RouteErrorComponent } from "#/components/ui/route-components";
import { AccountForm } from "#/features/coa/components/account-form";
import { ChartOfAccountsTable } from "#/features/coa/components/accounts-table";
import { accountQueries } from "#/features/coa/services/queries";
import { useOpenSheet } from "#/hooks/use-open-sheet";
import { sheetSchema } from "#/lib/schemas";
import { seo } from "#/lib/seo";

export const Route = createFileRoute("/(authed)/finance/chart-of-accounts")({
	component: RouteComponent,
	head: () => ({ meta: [...seo({ title: "Chart of accounts" })] }),
	errorComponent: ({ error, reset }) => (
		<RouteErrorComponent error={error} reset={reset} />
	),
	validateSearch: sheetSchema.safeExtend({
		accountId: z.number().optional().catch(undefined),
	}),
	loader: async ({ context: { queryClient } }) => {
		return queryClient.ensureQueryData(accountQueries.parentAccounts());
	},
});

function RouteComponent() {
	const navigate = useNavigate({ from: "/finance/chart-of-accounts" });
	const search = Route.useSearch();

	useOpenSheet({
		from: "/finance/chart-of-accounts",
		search,
		configs: {
			new: {
				options: {
					title: "New Account",
					description: "Add a new account record.",
				},
				render: ({ closeSheet }) => <AccountForm onSuccess={closeSheet} />,
			},
			edit: {
				options: {
					title: "Edit Account",
					description: "Update the account details.",
				},
				render: ({ search, closeSheet }) => (
					<AccountForm accountId={search.accountId} onSuccess={closeSheet} />
				),
			},
		},
	});
	return (
		<BasePageComponent
			pageTitle="Chart of accounts"
			pageDescription="Manage your chart of accounts."
			onSearch={() => {}}
			searchPlaceholder="Search chart of accounts..."
			hasNewButton
			newButtonAction={() => navigate({ search: { sheet: "new" } })}
			buttonText="Create Account"
		>
			<ChartOfAccountsTable />
		</BasePageComponent>
	);
}

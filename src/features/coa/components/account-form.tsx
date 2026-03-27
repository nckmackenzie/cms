import { useStore } from "@tanstack/react-form";
import { useQuery } from "@tanstack/react-query";
import { useLoaderData } from "@tanstack/react-router";
import type z from "zod";
import { FieldGroup } from "#/components/ui/field";
import { ACCOUNT_TYPES } from "#/db/schema";
import { upsertAccount } from "#/features/coa/services/coa.api";
import { accountQueries } from "#/features/coa/services/queries";
import { accountsFormSchema } from "#/features/coa/utils/schemas";
import { useAppForm } from "#/hooks/form";
import { useFormUpsert } from "#/hooks/use-form-upsert";
import { toTitleCase } from "#/lib/utils";

type AccountForm = {
	onSuccess: () => void;
	accountId?: number;
};

const defaultValues = {
	name: "",
	accountType: "asset",
	isSubcategory: false,
	parentId: null,
	description: null,
	isActive: true,
	isBankAccount: false,
	accountNumber: null,
	openingBalance: null,
	openingBalanceDate: null,
} as z.infer<typeof accountsFormSchema>;

export function AccountForm({ onSuccess, accountId }: AccountForm) {
	const loaderParentAccounts = useLoaderData({
		from: "/(authed)/finance/chart-of-accounts",
	});
	const { data: parentAccountsFreshData } = useQuery(
		accountQueries.parentAccounts(),
	);
	const parentAccounts = parentAccountsFreshData || loaderParentAccounts;
	const accountMutation = useFormUpsert({
		entityName: "Account",
		queryKey: ["accounts"],
		upsertFn: (data: z.infer<typeof accountsFormSchema>) =>
			upsertAccount({ data }),
	});

	const form = useAppForm({
		defaultValues: defaultValues,
		validators: {
			onSubmit: accountsFormSchema,
		},
		onSubmit: ({ value }) => {
			accountMutation.mutate(
				{ ...value, id: accountId?.toString() },
				{
					onSuccess: () => {
						onSuccess();
					},
				},
			);
		},
	});

	const [isSubcategory, type, isBankAccount] = useStore(form.store, (state) => [
		state.values.isSubcategory,
		state.values.accountType,
		state.values.isBankAccount,
	]);

	return (
		<div className="y-spacing bg-card p-4 rounded-lg">
			<form
				onSubmit={(e) => {
					e.preventDefault();
					form.handleSubmit();
				}}
			>
				<FieldGroup>
					<form.AppField name="name">
						{(field) => (
							<field.TextField
								placeholder="Account Name"
								label="Account Name"
							/>
						)}
					</form.AppField>
					<form.AppField name="accountType">
						{(field) => (
							<field.Select
								label="Account Type"
								values={ACCOUNT_TYPES.map((type) => ({
									value: type,
									label: toTitleCase(type),
								}))}
							/>
						)}
					</form.AppField>
					<FieldGroup className="flex flex-col md:flex-row md:items-center md:justify-between">
						{" "}
						<form.AppField name="isSubcategory">
							{(field) => <field.Switch label="Sub Category Of" />}
						</form.AppField>
						{type === "asset" && (
							<form.AppField name="isBankAccount">
								{(field) => <field.Switch label="Bank Account" />}
							</form.AppField>
						)}
					</FieldGroup>
					{type === "asset" && isBankAccount && (
						<FieldGroup className="grid md:grid-cols-2 gap-4">
							<form.AppField name="accountNumber">
								{(field) => (
									<field.TextField
										placeholder="Account Number"
										label="Account Number"
										fieldClassName="col-span-full"
									/>
								)}
							</form.AppField>
							{!accountId && (
								<>
									<form.AppField name="openingBalance">
										{(field) => (
											<field.TextField
												placeholder="Opening Balance"
												label="Opening Balance"
												type="number"
											/>
										)}
									</form.AppField>
									<form.AppField name="openingBalanceDate">
										{(field) => (
											<field.TextField
												type="date"
												label="Opening Balance Date"
											/>
										)}
									</form.AppField>
								</>
							)}
						</FieldGroup>
					)}
					<form.AppField name="parentId">
						{(field) => (
							<field.Select
								label="Parent Account"
								disabled={!isSubcategory}
								values={parentAccounts
									.filter((acc) => acc.type === type)
									.map((account) => ({
										value: account.value.toString(),
										label: account.label,
									}))}
							/>
						)}
					</form.AppField>
					<form.AppField name="description">
						{(field) => (
							<field.TextField placeholder="Description" label="Description" />
						)}
					</form.AppField>
					<form.AppForm>
						<form.SubmitButton
							isLoading={accountMutation.isPending}
							buttonText={accountId ? "Update" : "Create"}
							withReset
							onReset={() => {
								form.reset();
								onSuccess();
							}}
						/>
					</form.AppForm>
				</FieldGroup>
			</form>
		</div>
	);
}

import { useRouteContext } from "@tanstack/react-router";
import { CheckIcon } from "lucide-react";
import { FieldGroup } from "#/components/ui/field";
import { BackLink } from "#/components/ui/links";
import { PageHeader } from "#/components/ui/page-header";
import { upsertPettyCashReceipt } from "#/features/petty-cash/services/petty-cash.api";
import {
	type PettyCashReceiptValues,
	pettyCashFormSchema,
} from "#/features/petty-cash/utils/schemas";
import { useAppForm } from "#/hooks/form";
import { useFormUpsert } from "#/hooks/use-form-upsert";
import { dateFormat } from "#/lib/helpers";

interface PettyCashReceiptFormProps {
	initialData?: PettyCashReceiptValues;
}

export function PettyCashReceiptForm({
	initialData,
}: PettyCashReceiptFormProps) {
	const { banks, destinationAccounts } = useRouteContext({
		from: "/(authed)/finance/petty-cash",
		select: (s) => ({
			banks: s.banks,
			destinationAccounts: s.destinationAccounts,
		}),
	});

	const isEdit = !!initialData;

	const { mutate, isPending } = useFormUpsert({
		upsertFn: (values: PettyCashReceiptValues) =>
			upsertPettyCashReceipt({ data: values }),
		entityName: "Petty Cash Receipt",
		queryKey: ["petty-cash"],
		navigateTo: "/finance/petty-cash",
	});

	const form = useAppForm({
		defaultValues:
			initialData ??
			({
				receiptDate: dateFormat(new Date()),
				amount: 0,
				bankId: "",
				reference: "",
				description: undefined,
				creditingAccountId: "",
			} satisfies PettyCashReceiptValues),
		validators: {
			onSubmit: pettyCashFormSchema,
		},
		onSubmit: ({ value }) => {
			mutate(value);
		},
	});

	return (
		<div className="y-spacing">
			<BackLink href="/finance/petty-cash" removeLeftPadding>
				Back to Petty Cash
			</BackLink>
			<PageHeader
				title={isEdit ? "Update Petty Cash Receipt" : "New Petty Cash Receipt"}
				description={
					isEdit
						? "Update receipt information for this transaction."
						: "Record a petty cash transaction with receipt details."
				}
			/>
			<form
				className="y-spacing max-w-2xl rounded-md bg-card p-4"
				onSubmit={(e) => {
					e.preventDefault();
					form.handleSubmit();
				}}
			>
				<FieldGroup className="grid md:grid-cols-2 gap-6">
					<form.AppField name="receiptDate">
						{(field) => (
							<field.TextField required type="date" label="Receipt Date" />
						)}
					</form.AppField>
					<form.AppField name="amount">
						{(field) => (
							<field.TextField required type="number" label="Amount" />
						)}
					</form.AppField>
					<form.AppField name="bankId">
						{(field) => <field.Select required label="Bank" values={banks} />}
					</form.AppField>
					<form.AppField name="creditingAccountId">
						{(field) => (
							<field.Select
								required
								label="Destination Account"
								values={destinationAccounts}
							/>
						)}
					</form.AppField>
					<form.AppField name="reference">
						{(field) => (
							<field.TextField
								required
								label="Reference"
								placeholder="e.g. voucher # or reference code"
							/>
						)}
					</form.AppField>
					<form.AppField name="description">
						{(field) => (
							<field.TextField
								label="Description"
								fieldClassName="md:col-span-2"
								placeholder="Describe the purpose of this petty cash receipt"
							/>
						)}
					</form.AppField>
				</FieldGroup>
				<FieldGroup>
					<form.AppForm>
						<form.SubmitButton
							fieldClassName="justify-end"
							icon={<CheckIcon />}
							buttonText={isEdit ? "Update Receipt" : "Save Receipt"}
							cancelButtonText="Cancel"
							withReset
							isLoading={isPending}
						/>
					</form.AppForm>
				</FieldGroup>
			</form>
		</div>
	);
}

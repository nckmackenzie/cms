import { useStore } from "@tanstack/react-form";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
	getRouteApi,
	useLoaderData,
	useNavigate,
	useRouteContext,
} from "@tanstack/react-router";
import { CheckIcon, XIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { ActionButton } from "#/components/ui/action-button";
import { FieldGroup } from "#/components/ui/field";
import { FormGroupWithLabelInput } from "#/components/ui/form-group";
import { PageHeader } from "#/components/ui/page-header";
import { PAYMENT_METHODS } from "#/db/schema";
import { fundRequisitionsQueries } from "#/features/funds-requisitions/services/queries";
import {
	type ActionRequisitionValidateForm,
	actionRequisitionFormValues,
} from "#/features/funds-requisitions/utils/schema";
import { useAppForm } from "#/hooks/form";
import { useFormUpsert } from "#/hooks/use-form-upsert";
import { currencyFormatter, dateFormat, toNumber } from "#/lib/helpers";
import {
	approveRequisition,
	rejectRequisition,
} from "../services/funds-requisition.api";
import { fetchBalance } from "./requisition-form";

export function FundRequisitionActionForm() {
	const [amountAvailable, setAmountAvailable] = useState<number>(0);
	const contextData = useRouteContext({
		from: "/(authed)/finance/fund-requisitions/$requestId",
		select: (d) => d.requisition,
	});
	const { banks, accounts, sourceAccounts } = useLoaderData({
		from: "/(authed)/finance/fund-requisitions/$requestId/action",
	});
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const { requestId } = getRouteApi(
		"/(authed)/finance/fund-requisitions/$requestId/action",
	).useParams();
	const { data } = useQuery(fundRequisitionsQueries.detail(requestId));
	const requisition = data ?? contextData;
	const requestedBy =
		requisition.requestType === "group"
			? requisition.groupName
			: requisition.requestType === "district"
				? requisition.districtName
				: requisition.churchCategoryName;

	const { isPending, mutate } = useFormUpsert({
		upsertFn: (data: ActionRequisitionValidateForm) =>
			approveRequisition({ data }),
		entityName: "Requisition",
		queryKey: ["fund-requisitions"],
		navigateTo: "/finance/fund-requisitions",
		successMessage: {
			update: "Requisition approved successfully",
		},
	});

	const form = useAppForm({
		defaultValues: {
			id: requisition.id,
			paymentMethod: "cheque",
			paymentDate: dateFormat(new Date()),
			bankId: null,
			debitingAccountId: "",
			creditingAccountId: null,
			amountRequested: parseFloat(requisition.amountRequested),
			amountApproved: 0,
			reference: "",
		} as ActionRequisitionValidateForm,
		validators: {
			onSubmit: actionRequisitionFormValues,
		},
		onSubmit: ({ value }) => {
			mutate(value);
		},
	});

	const [paymentMethod, amountApproved] = useStore(form.store, (state) => [
		state.values.paymentMethod,
		state.values.amountApproved,
	]);

	const balance = useMemo(() => {
		return toNumber(amountAvailable) - toNumber(amountApproved);
	}, [amountAvailable, amountApproved]);

	useEffect(() => {
		if (!requisition.groupId && !requisition.districtId) return;
		const paramId =
			requisition.requestType === "group"
				? requisition.groupId
				: requisition.districtId;
		if (!paramId) return;
		fetchBalance(
			requisition.requestType,
			paramId,
			requisition.requisitionDate,
		).then((balance) => {
			setAmountAvailable(balance);
		});
	}, [requisition]);

	return (
		<div className="y-spacing">
			<PageHeader
				title="Approve/Reject Requisition"
				description={`Approve or Reject requisition submitted by ${requestedBy?.toUpperCase()}`}
			/>
			<form
				onSubmit={(e) => {
					e.preventDefault();
					form.handleSubmit();
				}}
				className="y-spacing max-w-4xl rounded-md bg-card p-4"
			>
				<FieldGroup className="grid grid-cols-1 md:grid-cols-4 gap-6">
					<FormGroupWithLabelInput
						labelName="Request #"
						inputProps={{
							readOnly: true,
							defaultValue: requisition.requisitionNo,
						}}
					/>
					<FormGroupWithLabelInput
						labelName="Request Date"
						inputProps={{
							readOnly: true,
							defaultValue: dateFormat(
								requisition.requisitionDate,
								"reporting",
							),
						}}
					/>
					<FormGroupWithLabelInput
						labelName="Request By"
						className="md:col-span-2"
						inputProps={{
							readOnly: true,
							defaultValue: requestedBy?.toUpperCase() ?? "",
						}}
					/>
					<FormGroupWithLabelInput
						labelName="Purpose"
						className="md:col-span-4"
						inputProps={{
							readOnly: true,
							defaultValue: requisition.purpose?.toUpperCase() ?? "",
						}}
					/>
					<FormGroupWithLabelInput
						labelName="Amount Available"
						inputProps={{
							readOnly: true,
							value: currencyFormatter(amountAvailable),
						}}
					/>
					<FormGroupWithLabelInput
						labelName="Amount Requested"
						inputProps={{
							readOnly: true,
							defaultValue: currencyFormatter(requisition.amountRequested),
						}}
					/>
					<form.AppField name="amountApproved">
						{(field) => (
							<field.TextField type="number" required label="Amount Approved" />
						)}
					</form.AppField>
					<FormGroupWithLabelInput
						labelName="Balance"
						inputProps={{
							readOnly: true,
							value: currencyFormatter(balance),
						}}
					/>
				</FieldGroup>
				<FieldGroup className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
					<form.AppField name="paymentDate">
						{(field) => (
							<field.TextField required type="date" label="Payment Date" />
						)}
					</form.AppField>
					<form.AppField name="paymentMethod">
						{(field) => (
							<field.Select
								label="Payment Method"
								required
								values={PAYMENT_METHODS.map((m) => ({
									value: m,
									label: m.toUpperCase(),
								}))}
							/>
						)}
					</form.AppField>
					{paymentMethod !== "cash" && (
						<form.AppField name="bankId">
							{(field) => <field.Select required label="Bank" values={banks} />}
						</form.AppField>
					)}
					{paymentMethod === "cash" && (
						<form.AppField name="creditingAccountId">
							{(field) => (
								<field.Select
									helperText="Where the money will be taken from"
									required
									label="Source Account"
									values={accounts}
								/>
							)}
						</form.AppField>
					)}
					<form.AppField name="reference">
						{(field) => (
							<field.TextField
								label="Reference"
								required
								placeholder="e.g. cheque # or Mpesa code"
							/>
						)}
					</form.AppField>
					<form.AppField name="debitingAccountId">
						{(field) => (
							<field.Select
								label="Destination Account"
								required
								fieldClassName="md:col-span-2"
								helperText="Where the money will be recorded"
								values={sourceAccounts}
							/>
						)}
					</form.AppField>
				</FieldGroup>
				<FieldGroup className="md:flex-row md:justify-between md:items-center">
					{/* TODO: PROPER WAY TO HANDLE THIS */}
					<ActionButton
						variant="destructive"
						size="xl"
						action={async () => rejectRequisition({ data: requestId })}
						requireAreYouSure
						onSuccess={() => {
							queryClient.invalidateQueries({
								queryKey: fundRequisitionsQueries.list({}).queryKey,
							});
							navigate({
								to: "/finance/fund-requisitions",
							});
						}}
					>
						<XIcon />
						Reject
					</ActionButton>
					<form.AppForm>
						<form.SubmitButton
							fieldClassName="justify-end"
							icon={<CheckIcon />}
							buttonText="Approve"
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

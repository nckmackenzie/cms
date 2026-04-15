import { useStore } from "@tanstack/react-form";
import { useRouteContext } from "@tanstack/react-router";
import { CheckIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { FieldGroup } from "#/components/ui/field";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { PageHeader } from "#/components/ui/page-header";
import { FUND_REQUISITION_TYPE, type FundRequisitionType } from "#/db/schema";
import { upsertFundRequistion } from "#/features/funds-requisitions/services/funds-requisition.api";
import {
	type FundsRequisitionValidateForm,
	fundsRequisitionFormValues,
} from "#/features/funds-requisitions/utils/schema";
import { useAppForm } from "#/hooks/form";
import { useFormUpsert } from "#/hooks/use-form-upsert";
import { dateFormat } from "#/lib/helpers";
import { toTitleCase } from "#/lib/utils";

export async function fetchBalance(
	requestType: FundRequisitionType,
	paramId: string,
	requisitionDate: string,
) {
	const response = await fetch(
		`/api/fund-requisitions/get-balance?requestType=${requestType}&paramId=${paramId}&requisitionDate=${requisitionDate}`,
	);
	const balance = await response.json();
	if (!response.ok) {
		throw new Error(balance.error);
	}
	return balance;
}

const defaultValues = {
	requisitionDate: dateFormat(new Date()),
	requestType: "group",
	amountRequested: 0,
	purpose: "",
	districtId: null,
	groupId: null,
	churchCategoryId: null,
	dontDeduct: false,
} as FundsRequisitionValidateForm;

export function FundRequisitionForm({
	requisitionNo,
	initialData,
}: {
	requisitionNo?: number;
	initialData?: FundsRequisitionValidateForm;
}) {
	const { districts, groups } = useRouteContext({
		from: "/(authed)/finance/fund-requisitions",
		select: (data) => ({ districts: data.districts, groups: data.groups }),
	});

	const { isPending, mutate } = useFormUpsert({
		upsertFn: (values: FundsRequisitionValidateForm) =>
			upsertFundRequistion({ data: values }),
		entityName: "Requisition",
		queryKey: ["fund-requisitions"],
		navigateTo: "/finance/fund-requisitions",
	});

	const form = useAppForm({
		defaultValues: initialData ?? {
			...defaultValues,
			requisitionNo: requisitionNo ?? 0,
		},
		validators: {
			onSubmit: fundsRequisitionFormValues,
		},
		onSubmit: async ({ value }) => {
			mutate({ ...value, id: initialData?.id });
		},
	});
	const [requestType, groupId, districtId, requisitionDate] = useStore(
		form.store,
		(state) => [
			state.values.requestType,
			state.values.groupId,
			state.values.districtId,
			state.values.requisitionDate,
		],
	);

	useEffect(() => {
		if (requestType === "district") {
			form.setFieldValue("groupId", null);
			form.setFieldValue("churchCategoryId", null);
		}
		if (requestType === "group") {
			form.setFieldValue("districtId", null);
			form.setFieldValue("churchCategoryId", null);
		}
		if (requestType === "church") {
			form.setFieldValue("districtId", null);
			form.setFieldValue("groupId", null);
		}
	}, [requestType, form]);
	const [amountAvailable, setAmountAvailable] = useState<number>(0);

	useEffect(() => {
		if (!groupId && !districtId) return;
		const paramId = requestType === "group" ? groupId : districtId;
		if (!paramId) return;
		fetchBalance(requestType, paramId, requisitionDate)
			.then((balance) => {
				setAmountAvailable(balance);
			})
			.catch((error) => {
				toast.error(error.message);
			});
	}, [groupId, districtId, requestType, requisitionDate]);
	const isEdit = !!initialData;

	return (
		<div className="y-spacing">
			<PageHeader
				title={isEdit ? "Update Fund Requisition" : "Create Fund Requisition"}
				description={
					isEdit
						? `Update requisition ${initialData.requisitionNo} details.`
						: "Enter details to create a requisition."
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
					<form.AppField name="requisitionNo">
						{(field) => (
							<field.TextField label="Requisition No" type="number" readOnly />
						)}
					</form.AppField>
					<form.AppField name="requisitionDate">
						{(field) => (
							<field.TextField type="date" label="Requisition Date" />
						)}
					</form.AppField>
					<form.AppField name="requestType">
						{(field) => (
							<field.Select
								label="Request Type"
								values={FUND_REQUISITION_TYPE.map((value) => ({
									label: toTitleCase(value),
									value,
								}))}
							/>
						)}
					</form.AppField>
					{requestType === "group" && (
						<form.AppField name="groupId">
							{(field) => (
								<field.Select label="Select a Group" values={groups} />
							)}
						</form.AppField>
					)}
					{requestType === "district" && (
						<form.AppField name="districtId">
							{(field) => (
								<field.Select label="Select a District" values={districts} />
							)}
						</form.AppField>
					)}
					<div className="grid gap-2">
						<Label>Amount Available</Label>
						<Input readOnly value={amountAvailable} />
					</div>
					<form.AppField name="amountRequested">
						{(field) => (
							<field.TextField type="number" label="Amount Requested" />
						)}
					</form.AppField>
					<form.AppField name="purpose">
						{(field) => (
							<field.TextField
								label="Purpose"
								placeholder="Describe the purpose of this requisition…"
								fieldClassName="col-span-full"
							/>
						)}
					</form.AppField>
					<form.AppField name="dontDeduct">
						{(field) => (
							<field.FormCheckbox
								fieldClassName="col-span-full"
								label="Don't Deduct"
								helperText="If checked, this amount will not be deducted from available funds."
							/>
						)}
					</form.AppField>
				</FieldGroup>
				<FieldGroup>
					<form.AppForm>
						<form.SubmitButton
							fieldClassName="justify-end"
							icon={<CheckIcon />}
							buttonText={isEdit ? "Update Requisition" : "Update Requisition"}
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

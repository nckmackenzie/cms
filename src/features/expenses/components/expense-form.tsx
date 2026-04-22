import { useStore } from "@tanstack/react-form";
import { useQuery } from "@tanstack/react-query";
import { useRouteContext } from "@tanstack/react-router";
import { TrashIcon } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";
import { Button } from "#/components/ui/button";
import { FieldGroup } from "#/components/ui/field";
import { Input } from "#/components/ui/input";
import { BackLink } from "#/components/ui/links";
import { PageHeader } from "#/components/ui/page-header";
import {
	Table,
	TableBody,
	TableCell,
	TableFooter,
	TableHead,
	TableHeader,
	TableRow,
} from "#/components/ui/table";
import { EXPENSE_TYPES, PAYMENT_METHODS } from "#/db/schema";
import { expenseQueries } from "#/features/expenses/services/query";
import {
	type ExpenseFormValues,
	expenseFormSchema,
} from "#/features/expenses/utils/schemas";
import { useAppForm } from "#/hooks/form";
import { useFormUpsert } from "#/hooks/use-form-upsert";
import { currencyFormatter, dateFormat, toNumber } from "#/lib/helpers";
import { toTitleCase } from "#/lib/utils";
import { upsertExpense } from "../services/expenses.api";

const initialLineValues = {
	id: crypto.randomUUID(),
	accountId: "",
	description: "",
	amount: 0,
};

const truncatePurpose = (purpose: string, maxLength = 20) => {
	const formattedPurpose = purpose.toUpperCase();
	return formattedPurpose.length > maxLength
		? `${formattedPurpose.slice(0, maxLength).trimEnd()}...`
		: formattedPurpose;
};

type ExpenseFormProps = {
	voucherNo?: number;
	initialData?: ExpenseFormValues;
};

export function ExpenseForm({ voucherNo, initialData }: ExpenseFormProps) {
	const { banks, expenseAccounts, assetAccounts, groups, districts } =
		useRouteContext({
			from: "/(authed)/finance/expenses",
			select: (state) => ({
				banks: state.banks,
				expenseAccounts: state.expenseAccounts,
				assetAccounts: state.assetAccounts,
				groups: state.groups,
				districts: state.districts,
			}),
		});

	const { isPending, mutate } = useFormUpsert({
		upsertFn: (data: ExpenseFormValues) => upsertExpense({ data }),
		entityName: "Expense",
		queryKey: ["expenses"],
		navigateTo: "/finance/expenses",
	});

	const isEdit = !!initialData;

	const form = useAppForm({
		defaultValues:
			initialData ??
			({
				expenseDate: dateFormat(new Date()),
				expenseType: "church",
				voucherNo,
				paymentMethod: "cheque",
				reference: "",
				bankId: null,
				sourceAccountId: null,
				requisitionId: null,
				groupId: null,
				districtId: null,
				lines: [initialLineValues],
			} as ExpenseFormValues),
		validators: {
			onSubmit: expenseFormSchema,
		},
		onSubmit: ({ value }) => {
			mutate(value);
		},
	});

	const [
		lines,
		expenseType,
		paymentMethod,
		groupId,
		districtId,
		requisitionId,
	] = useStore(form.store, (state) => [
		state.values.lines,
		state.values.expenseType,
		state.values.paymentMethod,
		state.values.groupId,
		state.values.districtId,
		state.values.requisitionId,
	]);

	const canLoadRequisitions =
		(expenseType === "group" && !!groupId) ||
		(expenseType === "district" && !!districtId);

	const {
		data: availableRequisitions = [],
		isFetching: isFetchingRequisitions,
	} = useQuery({
		...expenseQueries.availableRequisitions({
			expenseType,
			groupId,
			districtId,
		}),
		enabled: canLoadRequisitions,
	});

	const { data: currentRequisitionOption } = useQuery({
		...expenseQueries.currentRequisitionOption(
			initialData?.requisitionId ?? "",
		),
		enabled: !!initialData?.requisitionId,
	});

	const previousExpenseType = useRef(expenseType);
	const previousGroupId = useRef(groupId);
	const previousDistrictId = useRef(districtId);

	const requisitionOptions = useMemo(() => {
		const options = availableRequisitions.map((requisition) => ({
			value: requisition.value,
			label: `REQ ${requisition.requisitionNo} - ${truncatePurpose(
				requisition.purpose,
			)}`,
		}));

		if (
			currentRequisitionOption &&
			requisitionId === currentRequisitionOption.value &&
			!options.some((option) => option.value === currentRequisitionOption.value)
		) {
			options.unshift({
				value: currentRequisitionOption.value,
				label: `REQ ${currentRequisitionOption.requisitionNo} - ${truncatePurpose(
					currentRequisitionOption.purpose,
				)} - CURRENT`,
			});
		}

		return options;
	}, [availableRequisitions, currentRequisitionOption, requisitionId]);

	const total = useMemo(() => {
		return lines.reduce((acc, line) => acc + toNumber(line.amount), 0);
	}, [lines]);

	useEffect(() => {
		if (paymentMethod === "cash") {
			form.setFieldValue("bankId", null);
		} else {
			form.setFieldValue("sourceAccountId", null);
		}
	}, [paymentMethod, form]);

	useEffect(() => {
		if (previousExpenseType.current === expenseType) return;

		if (expenseType === "church") {
			form.setFieldValue("requisitionId", null);
			form.setFieldValue("groupId", null);
			form.setFieldValue("districtId", null);
		} else if (expenseType === "group") {
			form.setFieldValue("requisitionId", null);
			form.setFieldValue("districtId", null);
		} else if (expenseType === "district") {
			form.setFieldValue("requisitionId", null);
			form.setFieldValue("groupId", null);
		}
		previousExpenseType.current = expenseType;
	}, [expenseType, form]);

	useEffect(() => {
		if (
			expenseType === "group" &&
			previousGroupId.current !== groupId &&
			groupId
		) {
			form.setFieldValue("requisitionId", null);
		}
		if (
			expenseType === "district" &&
			previousDistrictId.current !== districtId &&
			districtId
		) {
			form.setFieldValue("requisitionId", null);
		}
		previousGroupId.current = groupId;
		previousDistrictId.current = districtId;
	}, [expenseType, groupId, districtId, form]);

	return (
		<form
			className="min-h-[calc(100vh-6rem)] md:min-h-[calc(100vh-7rem)] flex flex-col max-w-5xl"
			onSubmit={(e) => {
				e.preventDefault();
				e.stopPropagation();
				form.handleSubmit();
			}}
		>
			<div className="flex-1 y-spacing">
				<BackLink className="pl-0" variant="link">
					Go Back
				</BackLink>
				<PageHeader
					title={isEdit ? "Update Expense" : "New Expense"}
					description={
						isEdit
							? `Update expense voucher ${initialData?.voucherNo} details.`
							: "Fill in the details to record a new expense."
					}
				/>
				<FieldGroup className="rounded-md bg-card p-4 grid gap-4 md:grid-cols-3">
					<form.AppField name="voucherNo">
						{(field) => (
							<field.TextField
								required
								label="Voucher No"
								type="number"
								readOnly
							/>
						)}
					</form.AppField>
					<form.AppField name="expenseDate">
						{(field) => (
							<field.TextField required label="Expense Date" type="date" />
						)}
					</form.AppField>
					<div />
					<form.AppField name="expenseType">
						{(field) => (
							<field.Select
								label="Expense Type"
								required
								values={EXPENSE_TYPES.map((t) => ({
									value: t,
									label: toTitleCase(t),
								}))}
							/>
						)}
					</form.AppField>
					{expenseType === "church" && (
						<div className="grid gap-2">
							<span className="text-sm font-medium">Cost Centre</span>
							<Input readOnly value="CHURCH" />
						</div>
					)}
					{expenseType === "group" && (
						<form.AppField name="groupId">
							{(field) => (
								<field.Select values={groups} required label="Cost Centre" />
							)}
						</form.AppField>
					)}
					{expenseType === "district" && (
						<form.AppField name="districtId">
							{(field) => (
								<field.Select values={districts} required label="Cost Centre" />
							)}
						</form.AppField>
					)}
					<form.AppField name="requisitionId">
						{(field) => (
							<field.Select
								disabled={expenseType === "church" || !canLoadRequisitions}
								label="Requisition"
								placeholder={
									expenseType === "church"
										? "Not applicable for church expenses"
										: isFetchingRequisitions
											? "Loading requisitions..."
											: canLoadRequisitions
												? "Select requisition"
												: "Select cost centre first"
								}
								values={requisitionOptions}
							/>
						)}
					</form.AppField>
					<form.AppField name="paymentMethod">
						{(field) => (
							<field.Select
								label="Payment Method"
								required
								values={PAYMENT_METHODS.map((t) => ({
									value: t,
									label: toTitleCase(t),
								}))}
							/>
						)}
					</form.AppField>
					{paymentMethod === "cash" && (
						<form.AppField name="sourceAccountId">
							{(field) => (
								<field.Select
									required
									label="Source Account"
									values={assetAccounts}
								/>
							)}
						</form.AppField>
					)}
					{paymentMethod !== "cash" && (
						<form.AppField name="bankId">
							{(field) => <field.Select required label="Bank" values={banks} />}
						</form.AppField>
					)}
					<form.AppField name="reference">
						{(field) => (
							<field.TextField
								required
								label="Reference"
								placeholder="eg Cheque no,Mpesa reference,etc"
							/>
						)}
					</form.AppField>
				</FieldGroup>
				<section className="rounded-md bg-card p-4 shadow-sm">
					<form.Field name="lines" mode="array">
						{(field) => (
							<>
								<div className="mb-4 flex justify-end gap-2">
									<Button
										type="button"
										variant="outline"
										onClick={() =>
											field.pushValue({
												...initialLineValues,
												id: crypto.randomUUID(),
											})
										}
									>
										Add Line
									</Button>
									<Button type="button" variant="destructive">
										Clear Lines
									</Button>
								</div>
								{field.state.value.length === 0 ? (
									<div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
										No expenses added
									</div>
								) : (
									<Table className="overflow-x-auto">
										<TableHeader>
											<TableRow>
												<TableHead className="w-[30%]">Account</TableHead>
												<TableHead>Description</TableHead>
												<TableHead className="w-[140px]">Amount</TableHead>
												<TableHead className="w-[56px]"></TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{field.state.value.map((line, index) => (
												<TableRow key={line.id}>
													<TableCell>
														<form.AppField name={`lines[${index}].accountId`}>
															{(field) => (
																<field.Select values={expenseAccounts} />
															)}
														</form.AppField>
													</TableCell>
													<TableCell>
														<form.AppField name={`lines[${index}].description`}>
															{(field) => <field.TextField />}
														</form.AppField>
													</TableCell>
													<TableCell>
														<form.AppField name={`lines[${index}].amount`}>
															{(field) => <field.TextField type="number" />}
														</form.AppField>
													</TableCell>
													<TableCell>
														<Button
															type="button"
															variant="ghost"
															size="icon-sm"
															aria-label="Remove line"
															onClick={() => field.removeValue(index)}
														>
															<TrashIcon className="text-destructive" />
														</Button>
													</TableCell>
												</TableRow>
											))}
										</TableBody>
										<TableFooter>
											<TableRow>
												<TableCell colSpan={2}>Total</TableCell>
												<TableCell>{currencyFormatter(total)}</TableCell>
												<TableCell></TableCell>
											</TableRow>
										</TableFooter>
									</Table>
								)}
							</>
						)}
					</form.Field>
				</section>
			</div>
			<div className="flex justify-end py-3">
				<form.AppForm>
					<form.SubmitButton
						fieldClassName="justify-end"
						withReset
						buttonText={isEdit ? "Update Expense" : "Save Expense"}
						isLoading={isPending}
					/>
				</form.AppForm>
			</div>
		</form>
	);
}

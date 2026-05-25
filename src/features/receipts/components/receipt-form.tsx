import { useStore } from "@tanstack/react-form";
import { useQuery } from "@tanstack/react-query";
import { useRouteContext } from "@tanstack/react-router";
import {
	ChurchIcon,
	MapPinHouseIcon,
	PlusIcon,
	ReceiptIcon,
	StickyNoteIcon,
	Trash2Icon,
	UserIcon,
	UsersIcon,
} from "lucide-react";
import { useEffect, useMemo } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "#/components/ui/button";
import {
	Card,
	CardAction,
	CardContent,
	CardHeader,
} from "#/components/ui/card";
import { FieldGroup } from "#/components/ui/field";
import { BackLink } from "#/components/ui/links";
import { receiptQueries } from "#/features/receipts/services/queries";
import { upsertReceipt as upsertReceiptApi } from "#/features/receipts/services/receipts.api";
import {
	type ReceiptsFormValues,
	receiptsFormSchema,
} from "#/features/receipts/utils/schema";
import { useAppForm } from "#/hooks/form";
import { useFormUpsert } from "#/hooks/use-form-upsert";
import { cn, toTitleCase } from "#/lib/utils";
import { currencyFormatter, dateFormat } from "@/lib/helpers";

const CATEGORIES = [
	// { value: "member", label: "Member" },
	{ value: "group", label: "Group" },
	{ value: "district", label: "District" },
	// { value: "congregation", label: "Congregation" },
	{ value: "service", label: "Service" },
];

type ReceiptFormProps = {
	receiptId?: string;
	receiptNo?: number;
	initialValues?: ReceiptsFormValues;
};

export function ReceiptsForm({
	receiptId,
	receiptNo,
	initialValues,
}: ReceiptFormProps) {
	const isEdit = Boolean(receiptId);
	const { data } = useQuery({
		...receiptQueries.receiptNo(),
		enabled: !isEdit,
	});
	const { bankAccounts } = useRouteContext({
		from: "/(authed)/finance/receipts",
	});

	const { mutateAsync: upsertReceipt, isPending } = useFormUpsert({
		upsertFn: (values: ReceiptsFormValues) =>
			upsertReceiptApi({ data: values }),
		entityName: "Receipt",
		queryKey: ["receipts"],
		navigateTo: "/finance/receipts",
	});

	const defaultValues: ReceiptsFormValues = initialValues ?? {
		receiptNo: data ?? receiptNo ?? 0,
		contributionDate: dateFormat(new Date()),
		paymentMethod: "mpesa",
		bankId: null,
		reference: "",
		details: [],
	};

	const form = useAppForm({
		defaultValues,
		validators: {
			onSubmit: receiptsFormSchema,
		},
		onSubmit: async ({ value }) => {
			if (value.details.length === 0) {
				toast.error("There must be at least one receipt line", {
					description: (
						<p className="text-xs text-muted-foreground">
							You need to add at least one receipt line before saving the
							receipt.
						</p>
					),
				});
				return;
			}
			try {
				await upsertReceipt({
					...value,
					id: receiptId ?? value.id,
				});
				if (!isEdit) {
					form.reset();
				}
			} catch (error) {
				console.log(error);
				toast.error("There was an error saving the receipt");
			}
		},
	});

	const [details, paymentMethod] = useStore(form.store, (state) => [
		state.values.details,
		state.values.paymentMethod,
	]);

	useEffect(() => {
		if (paymentMethod === "cash") {
			form.setFieldValue("bankId", null);
		}
	}, [paymentMethod, form]);

	function handleAddLine(details: ReceiptsFormValues["details"][number]) {
		form.pushFieldValue("details", details);
	}

	function handleOnRemove(index: number) {
		form.removeFieldValue("details", index);
	}

	return (
		<div className="max-w-7xl form-spacing">
			<form
				onSubmit={(e) => {
					e.preventDefault();
					e.stopPropagation();
					form.handleSubmit();
				}}
				className="form-spacing"
			>
				<FieldGroup className="flex-row">
					<BackLink href="/finance/receipts" size="xl">
						Back to Receipts
					</BackLink>
					<form.AppForm>
						<form.SubmitButton
							fieldClassName="justify-end"
							buttonText={receiptId ? "Update Receipts" : "Save Receipts"}
							cancelButtonText="Cancel"
							withReset
							isLoading={isPending}
						/>
					</form.AppForm>
				</FieldGroup>
				<FieldGroup className="bg-popover p-4 grid md:grid-cols-2 gap-4 rounded-xl shadow-sm">
					<form.AppField name="receiptNo">
						{(field) => (
							<field.TextField readOnly type="number" label="Receipt No" />
						)}
					</form.AppField>
					<form.AppField name="contributionDate">
						{(field) => (
							<field.TextField type="date" label="Contribution Date" />
						)}
					</form.AppField>
					<div className="grid md:grid-cols-2 gap-4">
						<form.AppField name="paymentMethod">
							{(field) => (
								<field.Select
									label="Payment Method"
									values={[
										{ value: "cash", label: "Cash" },
										{ value: "cheque", label: "Cheque" },
										{ value: "mpesa", label: "M-Pesa" },
										{ value: "bank", label: "Bank" },
									]}
								/>
							)}
						</form.AppField>
						<form.AppField name="bankId">
							{(field) => (
								<field.Select
									disabled={paymentMethod === "cash"}
									label="Bank"
									values={bankAccounts}
									isNumber
								/>
							)}
						</form.AppField>
					</div>
					<form.AppField name="reference">
						{(field) => <field.TextField label="Reference" />}
					</form.AppField>
				</FieldGroup>
			</form>
			<AddReceiptline onAddLine={handleAddLine} />
			{details.length === 0 ? (
				<div className="flex flex-col items-center justify-center py-10 text-muted-foreground/50 gap-2 bg-popover rounded-xl shadow-sm">
					<ReceiptIcon size={28} strokeWidth={1.2} />
					<p className="text-sm">No receipt lines yet. Add one from above.</p>
				</div>
			) : (
				<div className="space-y-2">
					{details.map((detail, index) => (
						<Detail
							key={detail.id}
							detail={detail}
							index={index}
							onRemove={handleOnRemove}
						/>
					))}
				</div>
			)}
		</div>
	);
}

type AddReceiptlineProps = {
	onAddLine: (details: ReceiptsFormValues["details"][number]) => void;
};

const detailsSchema = z.object({
	id: z.string(),
	category: z.enum(["district", "group", "service", "member", "congregation"]),
	contributorDistrictId: z.number().nullish(),
	contributorGroupId: z.number().nullish(),
	contributorServiceId: z.number().nullish(),
	accountId: z.number().min(1, "Account is required"),
	amount: z.number().positive({ error: "Amount must be positive" }),
	narration: z.string().optional(),
});

function AddReceiptline({ onAddLine }: AddReceiptlineProps) {
	const { accounts, districts, groups, services } = useRouteContext({
		from: "/(authed)/finance/receipts",
	});

	const form = useAppForm({
		defaultValues: {
			id: "",
			category: "district",
			contributorDistrictId: null,
			contributorGroupId: null,
			contributorServiceId: null,
			accountId: 0,
			amount: 0,
			reference: "",
			narration: "",
		} as z.infer<typeof detailsSchema>,
		validators: {
			onSubmit: detailsSchema,
		},
		onSubmit: ({ value }) => {
			onAddLine({ ...value, id: crypto.randomUUID() });
			form.reset();
		},
	});
	const [category] = useStore(form.store, (state) => [state.values.category]);

	useEffect(() => {
		if (category === "district") {
			form.setFieldValue("contributorGroupId", undefined);
			form.setFieldValue("contributorServiceId", undefined);
		}
		if (category === "group") {
			form.setFieldValue("contributorDistrictId", undefined);
			form.setFieldValue("contributorServiceId", undefined);
		}
		if (category === "service") {
			form.setFieldValue("contributorDistrictId", undefined);
			form.setFieldValue("contributorGroupId", undefined);
		}
	}, [form, category]);

	return (
		<form
			onSubmit={(e) => {
				e.preventDefault();
				e.stopPropagation();
				form.handleSubmit();
			}}
			className="bg-popover p-4 rounded-xl shadow-sm form-spacing"
		>
			<FieldGroup className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
				<form.AppField name="accountId">
					{(field) => (
						<field.Select
							label="Account"
							isNumber
							values={accounts.map(({ value, label }) => ({
								value: value.toString(),
								label,
							}))}
						/>
					)}
				</form.AppField>
				<form.AppField name="category">
					{(field) => <field.Select label="Category" values={CATEGORIES} />}
				</form.AppField>
				{category === "district" && (
					<form.AppField name="contributorDistrictId">
						{(field) => (
							<field.Select
								label="District"
								isNumber
								values={districts.map(({ value, label }) => ({
									value: value.toString(),
									label: toTitleCase(label),
								}))}
							/>
						)}
					</form.AppField>
				)}
				{category === "group" && (
					<form.AppField name="contributorGroupId">
						{(field) => (
							<field.Select
								label="Group"
								isNumber
								values={groups.map(({ value, label }) => ({
									value: value.toString(),
									label: toTitleCase(label),
								}))}
							/>
						)}
					</form.AppField>
				)}
				{category === "service" && (
					<form.AppField name="contributorServiceId">
						{(field) => (
							<field.Select
								label="Service"
								isNumber
								values={services.map(({ value, label }) => ({
									value: value.toString(),
									label: toTitleCase(label),
								}))}
							/>
						)}
					</form.AppField>
				)}
				<form.AppField name="amount">
					{(field) => <field.TextField type="number" label="Amount" />}
				</form.AppField>
				<form.AppField name="narration">
					{(field) => (
						<field.TextField
							label="Description"
							fieldClassName="lg:col-span-2"
						/>
					)}
				</form.AppField>
			</FieldGroup>
			<FieldGroup>
				<Button
					type="submit"
					variant="secondary"
					className="w-full md:w-fit"
					size="xl"
				>
					<PlusIcon />
					Add Line
				</Button>
			</FieldGroup>
		</form>
	);
}

function Detail({
	detail,
	index,
	onRemove,
}: {
	detail: ReceiptsFormValues["details"][number];
	index: number;
	onRemove: (index: number) => void;
}) {
	const { districts, groups, services, accounts } = useRouteContext({
		from: "/(authed)/finance/receipts",
	});
	const accountLabel =
		accounts.find((account) => Number(account.value) === detail.accountId)
			?.label ?? "—";
	const contributor = useMemo(() => {
		if (detail.category === "district") {
			return districts.find(
				(d) => Number(d.value) === detail.contributorDistrictId,
			)?.label;
		}
		if (detail.category === "group") {
			return groups.find((g) => Number(g.value) === detail.contributorGroupId)
				?.label;
		}
		if (detail.category === "service") {
			return services.find((s) => Number(s.value) === detail.contributorServiceId)
				?.label;
		}
		return "—";
	}, [detail, districts, groups, services]);
	return (
		<Card size="sm" className="border border-border/80 bg-popover/80">
			<CardHeader className="pb-0">
				<div className="flex items-center gap-3">
					<div className="flex items-center justify-center size-7 rounded-full text-[11px] font-semibold shrink-0 bg-muted text-muted-foreground">
						{index + 1}
					</div>
					<div className="flex min-w-0 flex-1 items-center gap-3 flex-wrap">
						<CategoryBadge category={detail.category} />
						<span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
							<UserIcon size={12} strokeWidth={2} />
							{contributor !== "—" ? (
								contributor?.toUpperCase()
							) : (
								<span className="text-muted-foreground/40">No contributor</span>
							)}
						</span>
						<span className="text-sm font-medium text-foreground truncate min-w-[140px]">
							{accountLabel !== "—" ? (
								<span className="inline-flex items-center gap-1">
									<ReceiptIcon size={12} strokeWidth={2} />
									{accountLabel}
								</span>
							) : (
								<span className="text-muted-foreground/40">No account</span>
							)}
						</span>
					</div>
					<CardAction>
						<div className="flex items-center gap-2">
							<span
								className={cn(
									"font-display text-base font-semibold",
									detail.amount > 0
										? "text-foreground"
										: "text-muted-foreground/30",
								)}
							>
								{detail.amount > 0 ? currencyFormatter(detail.amount) : "—"}
							</span>
							<button
								type="button"
								onClick={(e) => {
									e.stopPropagation();
									onRemove(index);
								}}
								aria-label="Remove receipt line"
								className="p-1.5 rounded-md text-destructive hover:bg-danger transition-all duration-150"
							>
								<Trash2Icon size={13} strokeWidth={2} />
							</button>
						</div>
					</CardAction>
				</div>
			</CardHeader>
			{detail.narration && (
				<CardContent className="pt-2">
					<div className="flex items-center gap-1 text-xs text-muted-foreground">
						<StickyNoteIcon size={12} strokeWidth={2} />
						<span className="text-muted-foreground/70 line-clamp-1">
							{detail.narration}
						</span>
					</div>
				</CardContent>
			)}
		</Card>
	);
}

type Category = ReceiptsFormValues["details"][number]["category"];

const CATEGORY_ICONS: Record<Category, typeof UserIcon> = {
	member: UserIcon,
	group: UsersIcon,
	district: MapPinHouseIcon,
	service: ChurchIcon,
	congregation: ChurchIcon,
};

function CategoryBadge({ category }: { category: Category }) {
	const Icon = CATEGORY_ICONS[category];
	const colors: Record<Category, string> = {
		member: "bg-primary/10 text-primary",
		group: "bg-[oklch(0.65_0.15_45)/15] text-[oklch(0.45_0.12_45)]",
		district: "bg-info text-info-foreground",
		service: "bg-success text-success-foreground",
		congregation: "bg-success text-success-foreground",
	};
	return (
		<span
			className={cn(
				"inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold",
				colors[category],
			)}
		>
			<Icon size={10} strokeWidth={2.2} />
			{category.toUpperCase()}
		</span>
	);
}

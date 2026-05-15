import { useStore } from "@tanstack/react-form";
import { useRouteContext } from "@tanstack/react-router";
import { CheckIcon, DownloadIcon, UploadIcon } from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "#/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card";
import { Input } from "#/components/ui/input";
import { BackLink } from "#/components/ui/links";
import { LoadingSwap } from "#/components/ui/loading-swap";
import { PageHeader } from "#/components/ui/page-header";
import { PillTabs } from "#/components/ui/pill-tabs";
import { Search } from "#/components/ui/search";
import type { BudgetType } from "#/features/budgets/services/budget-accounts.api";
import { upsertBudget } from "#/features/budgets/services/budget-accounts.api";
import {
	type BudgetFormSchema,
	budgetFormSchema,
} from "#/features/budgets/utils/schemas";
import { useAppForm } from "#/hooks/form";
import { useFormUpsert } from "#/hooks/use-form-upsert";
import { currencyFormatter, toNumber } from "#/lib/helpers";
import { cn } from "#/lib/utils";

type FilterMode = "all" | "budgeted" | "unbudgeted";

function sanitizeMoneyInput(value: string) {
	return value.replace(/[^\d.,]/g, "");
}

function parseMoney(value: string) {
	return toNumber(value.replaceAll(",", ""));
}

export function BudgetForm({
	type,
	initialData,
}: {
	type: BudgetType;
	initialData?: BudgetFormSchema;
}) {
	const {
		groups,
		churchAccounts,
		groupAccounts,
		financialYears: years,
		currentYear,
	} = useRouteContext({ from: "/(authed)/finance/budgets" });
	const accounts = type === "church" ? churchAccounts : groupAccounts;
	const isEdit = !!initialData;

	const { mutate, isPending } = useFormUpsert({
		upsertFn: (data: BudgetFormSchema) => upsertBudget({ data }),
		entityName: "Budget",
		queryKey: ["budgets"],
		navigateTo: "/finance/budgets",
	});

	const form = useAppForm({
		defaultValues:
			initialData ??
			({
				type,
				groupId: undefined,
				financialYearId: currentYear?.publicId || years[0]?.publicId,
				accounts: accounts.map((a) => ({
					id: a.publicId,
					amount: 0,
				})),
			} as BudgetFormSchema),
		validators: {
			onChange: budgetFormSchema,
		},
		onSubmit: ({ value }) => {
			mutate({ ...value, id: initialData?.id });
		},
	});

	const { AppField, handleSubmit } = form;
	const [isValid, formAccounts] = useStore(
		form.store,
		({ isValid, values }) => [isValid, values.accounts],
	);

	const [filterMode, setFilterMode] = useState<FilterMode>("all");
	const [accountSearch, setAccountSearch] = useState("");
	const [importErrors, setImportErrors] = useState<string[] | null>(null);
	const fileInputRef = useRef<HTMLInputElement | null>(null);

	const amountByAccountId = useMemo(() => {
		const map = new Map<string, number>();
		for (const entry of formAccounts ?? []) {
			map.set(entry.id, entry.amount ?? 0);
		}
		return map;
	}, [formAccounts]);

	const accountIndexById = useMemo(() => {
		const map = new Map<string, number>();
		for (let i = 0; i < (formAccounts?.length ?? 0); i += 1) {
			map.set(formAccounts[i].id, i);
		}
		return map;
	}, [formAccounts]);

	const inputRefs = useRef(new Map<string, HTMLInputElement | null>());
	const registerInputRef = useCallback(
		(accountPublicId: string) => (node: HTMLInputElement | null) => {
			inputRefs.current.set(accountPublicId, node);
		},
		[],
	);

	const normalizedSearch = accountSearch.trim().toLowerCase();

	const filteredAccounts = useMemo(() => {
		return accounts.filter((account) => {
			if (
				normalizedSearch &&
				!account.name.toLowerCase().includes(normalizedSearch)
			) {
				return false;
			}

			const n = amountByAccountId.get(account.publicId) ?? 0;

			if (filterMode === "budgeted") return n > 0;
			if (filterMode === "unbudgeted") return n <= 0;
			return true;
		});
	}, [accounts, amountByAccountId, filterMode, normalizedSearch]);

	const visibleAccountIds = useMemo(() => {
		return filteredAccounts.map((a) => a.publicId);
	}, [filteredAccounts]);

	const focusRelativeAccount = useCallback(
		(accountPublicId: string, offset: number) => {
			const idx = visibleAccountIds.indexOf(accountPublicId);
			if (idx === -1) return;
			const next = visibleAccountIds[idx + offset];
			if (!next) return;
			inputRefs.current.get(next)?.focus();
		},
		[visibleAccountIds],
	);

	const grandTotal = useMemo(() => {
		let sum = 0;
		for (const account of accounts) {
			sum += amountByAccountId.get(account.publicId) ?? 0;
		}
		return sum;
	}, [accounts, amountByAccountId]);

	const canCreate = isValid;

	const handleDownloadTemplate = useCallback(async () => {
		try {
			if (accounts.length === 0) {
				toast.error("No expense accounts found to build a template.");
				return;
			}

			const { Workbook } = await import("exceljs");

			const workbook = new Workbook();
			workbook.creator = "CMS";
			workbook.created = new Date();

			const worksheet = workbook.addWorksheet("Budget Template", {
				views: [{ state: "frozen", ySplit: 1 }],
			});

			worksheet.columns = [
				{ header: "public_id", key: "public_id", width: 40, hidden: true },
				{ header: "Account Name", key: "account_name", width: 36 },
				{ header: "Budget Amount", key: "budget_amount", width: 18 },
			];

			const headerRow = worksheet.getRow(1);
			headerRow.font = { bold: true };
			headerRow.alignment = { vertical: "middle" };
			headerRow.height = 20;

			for (const account of accounts) {
				worksheet.addRow({
					public_id: account.publicId,
					account_name: account.name,
					budget_amount: null,
				});
			}

			worksheet.getColumn(3).numFmt = "0.00";

			for (let rowIndex = 2; rowIndex <= accounts.length + 1; rowIndex += 1) {
				const row = worksheet.getRow(rowIndex);
				row.getCell(1).protection = { locked: true, hidden: true };
				row.getCell(2).protection = { locked: true };

				const amountCell = row.getCell(3);
				amountCell.protection = { locked: false };
				amountCell.dataValidation = {
					type: "decimal",
					operator: "greaterThanOrEqual",
					allowBlank: true,
					showErrorMessage: true,
					errorStyle: "error",
					errorTitle: "Invalid Budget Amount",
					error: "Budget Amount must be a number greater than or equal to 0.",
					formulae: [0],
				};
			}

			await worksheet.protect("cms-budget-template", {
				selectLockedCells: true,
				selectUnlockedCells: true,
				formatCells: false,
				formatColumns: false,
				formatRows: false,
				insertColumns: false,
				insertRows: false,
				insertHyperlinks: false,
				deleteColumns: false,
				deleteRows: false,
				sort: false,
				autoFilter: true,
				pivotTables: false,
			});

			const buffer = await workbook.xlsx.writeBuffer();
			const blob = new Blob([buffer], {
				type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
			});
			const url = URL.createObjectURL(blob);

			const a = document.createElement("a");
			a.href = url;
			a.download = `budget-template-${type}.xlsx`;
			document.body.appendChild(a);
			a.click();
			a.remove();
			URL.revokeObjectURL(url);
		} catch (error) {
			console.error(error);
			toast.error("Failed to generate the Excel template.");
		}
	}, [accounts, type]);

	const validateAndApplyImport = useCallback(
		(rows: Array<{ publicId: string; amount: number }>) => {
			const allowed = new Set(accounts.map((a) => a.publicId));
			const seen = new Set<string>();
			const unknown: string[] = [];
			const duplicates: string[] = [];

			for (const row of rows) {
				if (seen.has(row.publicId)) duplicates.push(row.publicId);
				seen.add(row.publicId);
				if (!allowed.has(row.publicId)) unknown.push(row.publicId);
			}

			if (unknown.length > 0) {
				const list = unknown.slice(0, 10).join(", ");
				setImportErrors([
					`Unknown public_id found in sheet: ${list}${unknown.length > 10 ? "…" : ""}`,
				]);
				toast.error("Import failed: unknown public_id values found.");
				return;
			}

			if (duplicates.length > 0) {
				const list = duplicates.slice(0, 10).join(", ");
				setImportErrors([
					`Duplicate public_id found in sheet: ${list}${
						duplicates.length > 10 ? "…" : ""
					}`,
				]);
				toast.error("Import failed: duplicate public_id values found.");
				return;
			}

			const nextAccounts = accounts.map((a) => ({ id: a.publicId, amount: 0 }));
			const index = new Map(nextAccounts.map((a, i) => [a.id, i]));
			for (const row of rows) {
				const i = index.get(row.publicId);
				if (i === undefined) continue;
				nextAccounts[i] = { id: row.publicId, amount: row.amount };
			}

			setImportErrors(null);
			form.setFieldValue("accounts", nextAccounts);
			toast.success("Imported budget amounts.");
		},
		[accounts, form],
	);

	const handleImportTemplate = useCallback(
		async (file: File) => {
			try {
				if (accounts.length === 0) {
					toast.error("No expense accounts loaded yet.");
					return;
				}

				const { Workbook } = await import("exceljs");
				const buffer = await file.arrayBuffer();

				const workbook = new Workbook();
				await workbook.xlsx.load(buffer);
				const worksheet = workbook.worksheets[0];
				if (!worksheet) {
					toast.error("No worksheet found in the uploaded file.");
					return;
				}

				const headerRow = worksheet.getRow(1);
				//@ts-expect-error
				const headers = headerRow.values
					//@ts-expect-error
					.slice(1)
					.map((v: unknown) => String(v ?? "").trim());

				const indexByHeader = new Map<string, number>();
				for (let i = 0; i < headers.length; i += 1) {
					indexByHeader.set(headers[i], i + 1);
				}

				const colPublicId = indexByHeader.get("public_id");
				const colAmount = indexByHeader.get("Budget Amount");

				if (!colPublicId || !colAmount) {
					setImportErrors([
						"Missing required columns. Expected headers: public_id, Account Name, Budget Amount.",
					]);
					toast.error("Import failed: invalid template headers.");
					return;
				}

				const imported: Array<{ publicId: string; amount: number }> = [];
				const invalidAmounts: string[] = [];

				worksheet.eachRow((row, rowNumber) => {
					if (rowNumber === 1) return;

					const publicId = String(row.getCell(colPublicId).value ?? "").trim();
					if (!publicId) return;

					const cell = row.getCell(colAmount);
					const value = cell.value;

					if (value === null || value === undefined || value === "") {
						imported.push({ publicId, amount: 0 });
						return;
					}

					if (typeof value !== "number" || !Number.isFinite(value)) {
						invalidAmounts.push(`${publicId}`);
						return;
					}

					if (value < 0) {
						invalidAmounts.push(`${publicId}`);
						return;
					}

					imported.push({ publicId, amount: value });
				});

				if (invalidAmounts.length > 0) {
					const list = invalidAmounts.slice(0, 10).join(", ");
					setImportErrors([
						`Invalid Budget Amount (must be a non-negative number) for: ${list}${
							invalidAmounts.length > 10 ? "…" : ""
						}`,
					]);
					toast.error("Import failed: invalid Budget Amount values found.");
					return;
				}

				validateAndApplyImport(imported);
			} catch (error) {
				console.error(error);
				toast.error("Failed to import the uploaded Excel file.");
			}
		},
		[accounts, validateAndApplyImport],
	);

	return (
		<div className="y-spacing">
			<BackLink removeLeftPadding href="/finance/budgets">
				Back to Budgets
			</BackLink>
			<PageHeader
				title={
					isEdit
						? `Edit ${type === "group" ? "Group" : "Church"} Budget`
						: type === "group"
							? "New Group Budget"
							: "New Church Budget"
				}
				description="Set up the budget header, then enter amounts across expense accounts."
			/>
			<form
				onSubmit={(e) => {
					e.preventDefault();
					handleSubmit();
				}}
				className="space-y-6"
			>
				<Card className="shadow-sm">
					<CardHeader className="border-b border-b-border">
						<CardTitle>Budget Setup</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="grid gap-6 md:grid-cols-2">
							<AppField name="financialYearId">
								{(field) => (
									<field.Select
										disabled={isEdit}
										label="Financial Year"
										placeholder="Select year"
										values={years.map((l) => ({
											value: l.publicId,
											label: l.yearName,
										}))}
									/>
								)}
							</AppField>
							{type === "group" && (
								<AppField name="groupId">
									{(field) => (
										<field.Select
											disabled={isEdit}
											label="Group"
											placeholder="Select group"
											values={groups.map((g) => ({
												value: g.value,
												label: g.label.toUpperCase(),
											}))}
										/>
									)}
								</AppField>
							)}
						</div>

						<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
							<div className="flex flex-col gap-2 sm:flex-row sm:items-center">
								<Button
									type="button"
									variant="outline"
									onClick={handleDownloadTemplate}
									disabled={isPending}
								>
									<DownloadIcon />
									Download Excel Template
								</Button>
								<input
									ref={fileInputRef}
									type="file"
									accept=".xlsx"
									className="hidden"
									onChange={(e) => {
										const file = e.target.files?.[0];
										if (!file) return;
										void handleImportTemplate(file);
										e.target.value = "";
									}}
								/>
								<Button
									type="button"
									variant="outline"
									onClick={() => fileInputRef.current?.click()}
									disabled={isPending}
								>
									<UploadIcon />
									Import Filled Template
								</Button>
							</div>

							<Button
								type="submit"
								size="xl"
								// onClick={handleCreateBudget}
								disabled={!canCreate || isPending}
							>
								<LoadingSwap
									isLoading={isPending}
									className="flex gap-2 items-center"
								>
									<CheckIcon />
									{isEdit ? "Update Budget" : "Create Budget"}
								</LoadingSwap>
							</Button>
						</div>
					</CardContent>
				</Card>
				<Card className="shadow-sm">
					<CardHeader className="border-b border-b-border">
						<div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
							<div className="space-y-1">
								<CardTitle>Budget Workspace</CardTitle>
								<p className="text-sm text-muted-foreground">
									Search accounts, filter budgeted vs unbudgeted, and use Enter
									/ ↑ / ↓ to move quickly.
								</p>
							</div>

							<div className="flex flex-col gap-2 md:flex-row md:items-center">
								<PillTabs
									value={filterMode}
									onChange={(v) => setFilterMode(v as FilterMode)}
									options={[
										{ label: "All Accounts", value: "all" },
										{ label: "Budgeted", value: "budgeted" },
										{ label: "Unbudgeted", value: "unbudgeted" },
									]}
								/>
							</div>
						</div>
					</CardHeader>
					<CardContent className="space-y-3">
						{importErrors?.length ? (
							<div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
								<ul className="list-disc pl-5">
									{importErrors.map((err) => (
										<li key={err}>{err}</li>
									))}
								</ul>
							</div>
						) : null}
						<Search
							placeholder="Search expense accounts..."
							onHandleSearch={setAccountSearch}
							className="bg-card"
							parentClassName="max-w-full"
						/>

						<div className="rounded-xl border border-border bg-card overflow-hidden">
							<div className="max-h-[70vh] overflow-auto">
								<div className="sticky top-0 z-10 grid grid-cols-[1fr_180px] gap-3 border-b border-b-border bg-card/95 px-4 py-2 text-xs font-medium text-muted-foreground backdrop-blur">
									<div>Expense Account</div>
									<div className="text-right">Budget Amount</div>
								</div>

								{filteredAccounts.length === 0 ? (
									<div className="p-10 text-center text-sm text-muted-foreground">
										No accounts match your filters.
									</div>
								) : (
									<div className="divide-y divide-border">
										{filteredAccounts.map((account) => {
											const amount =
												amountByAccountId.get(account.publicId) ?? 0;
											const index = accountIndexById.get(account.publicId);

											return (
												<div
													key={account.publicId}
													className="grid grid-cols-[1fr_180px] items-center gap-3 px-4 py-1.5"
												>
													<div className="min-w-0 text-sm">
														<div className="truncate">{account.name}</div>
													</div>
													<div>
														<Input
															ref={registerInputRef(account.publicId)}
															inputMode="decimal"
															value={amount === 0 ? "" : String(amount)}
															placeholder="0.00"
															aria-label={`${account.name} budget amount`}
															className={cn(
																"h-9 rounded-md text-right font-medium tabular-nums",
																amount > 0 && "bg-accent/35",
															)}
															onChange={(e) => {
																if (index === undefined) return;
																const nextText = sanitizeMoneyInput(
																	e.target.value,
																);
																const nextAmount = nextText
																	? parseMoney(nextText)
																	: 0;
																if (
																	!Number.isFinite(nextAmount) ||
																	nextAmount < 0
																)
																	return;
																form.setFieldValue(
																	`accounts[${index}].amount`,
																	nextAmount,
																);
															}}
															onBlur={() => {
																if (index === undefined) return;
																const current = form.getFieldValue(
																	`accounts[${index}].amount`,
																);
																if (!Number.isFinite(current) || current < 0) {
																	form.setFieldValue(
																		`accounts[${index}].amount`,
																		0,
																	);
																}
															}}
															onKeyDown={(e) => {
																if (
																	e.key === "Enter" ||
																	e.key === "ArrowDown"
																) {
																	e.preventDefault();
																	focusRelativeAccount(account.publicId, 1);
																}
																if (e.key === "ArrowUp") {
																	e.preventDefault();
																	focusRelativeAccount(account.publicId, -1);
																}
																if (e.key === "Escape") {
																	e.preventDefault();
																	if (index !== undefined) {
																		form.setFieldValue(
																			`accounts[${index}].amount`,
																			0,
																		);
																	}
																}
															}}
														/>
													</div>
												</div>
											);
										})}
									</div>
								)}

								<div className="sticky bottom-0 z-10 grid grid-cols-[1fr_180px] gap-3 border-t border-t-border bg-card/95 px-4 py-2 text-sm font-semibold backdrop-blur">
									<div>Grand Total</div>
									<div className="text-right tabular-nums">
										{currencyFormatter(grandTotal)}
									</div>
								</div>
							</div>
						</div>
					</CardContent>
				</Card>
			</form>
		</div>
	);
}

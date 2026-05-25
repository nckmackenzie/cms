import { notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import {
	and,
	desc,
	eq,
	gte,
	type InferSelectModel,
	ilike,
	isNull,
	lte,
	or,
	type SQL,
	sql,
} from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import { db } from "#/db";
import {
	type DebitCredit,
	districts,
	EXPENSE_TYPES,
	expensesDetail,
	expensesHeader,
	fundRequisitions,
	groups,
	pettyCash,
} from "#/db/schema";
import { getAccountByPublicId } from "#/features/coa/services/coa.api";
import { getDistrictId } from "#/features/districts/services/districts.api";
import {
	type ExpenseFormValues,
	expenseFormSchema,
	expensesPageValidateSearch,
} from "#/features/expenses/utils/schemas";
import {
	getFinancialYearByDate,
	getFinancialYearById,
} from "#/features/fiscal-years/services/years.api";
import { getRequisitionByPublicId } from "#/features/funds-requisitions/services/funds-requisition.api";
import { getGroupIdFn } from "#/features/groups/services/groups.api";
import { createBankingEntry, deleteBankingEntry } from "#/lib/banking";
import { dateFormat, normalizeText, toNumber } from "#/lib/helpers";
import {
	areJournalValuesBalanced,
	createJournalEntry,
	deleteJournalEntry,
	type Transaction,
} from "#/lib/journal";
import { failure, success } from "#/lib/result";
import { stringSchema } from "#/lib/schemas";
import { authMiddleware } from "#/middleware/auth";

type ExpenseType = InferSelectModel<typeof expensesHeader>["expenseType"];
// type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

class ExpenseValidationError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "ExpenseValidationError";
	}
}

const getExpenseByStatus = async ({
	id,
	congregationId,
	status = "pending",
}: {
	id: string;
	congregationId: number;
	status?: "pending" | "approved" | "rejected";
}) => {
	return db.query.expensesHeader.findFirst({
		where: and(
			eq(expensesHeader.congregationId, congregationId),
			eq(expensesHeader.status, status),
			isNull(expensesHeader.deletedAt),
			eq(expensesHeader.publicId, id),
		),
		with: { details: true },
	});
};

const getVoucherNo = async ({
	congregationId,
	expenseDate,
}: {
	congregationId: number;
	expenseDate: string;
}) => {
	const year = await getFinancialYearByDate({ data: expenseDate });
	const [{ voucherNo }] = await db
		.select({
			voucherNo: sql<number>`MAX(${expensesHeader.voucherNo})`,
		})
		.from(expensesHeader)
		.where(
			and(
				eq(expensesHeader.congregationId, congregationId),
				isNull(expensesHeader.deletedAt),
				gte(expensesHeader.expenseDate, year.startDate),
				lte(expensesHeader.expenseDate, year.endDate),
			),
		);
	return voucherNo ? voucherNo + 1 : 1;
};

export const voucherNoFn = createServerFn()
	.middleware([authMiddleware])
	.inputValidator(z.string().optional())
	.handler(
		async ({
			data: date,
			context: {
				user: { congregationId },
			},
		}) => {
			return await getVoucherNo({
				congregationId,
				expenseDate: date ?? dateFormat(new Date()),
			});
		},
	);

const availableExpenseRequisitionsSchema = z
	.object({
		expenseType: z.enum(EXPENSE_TYPES),
		groupId: z.string().nullish(),
		districtId: z.string().nullish(),
	})
	.superRefine(({ expenseType, groupId, districtId }, ctx) => {
		if (expenseType === "group" && !groupId) {
			ctx.addIssue({
				code: "custom",
				message: "Group is required",
				path: ["groupId"],
			});
		}
		if (expenseType === "district" && !districtId) {
			ctx.addIssue({
				code: "custom",
				message: "District is required",
				path: ["districtId"],
			});
		}
		if (expenseType === "church") {
			ctx.addIssue({
				code: "custom",
				message: "Church expenses do not use requisitions",
				path: ["expenseType"],
			});
		}
	});

const getAvailableRequisitions = async ({
	congregationId,
	expenseType,
	groupId: groupPublicId,
	districtId: districtPublicId,
}: {
	congregationId: number;
	expenseType: ExpenseType;
	groupId?: string | null;
	districtId?: string | null;
}) => {
	const [groupId, districtId] = await Promise.all([
		expenseType === "group" && groupPublicId
			? getGroupIdFn({ data: { publicId: groupPublicId } })
			: Promise.resolve(undefined),
		expenseType === "district" && districtPublicId
			? getDistrictId({ data: { publicId: districtPublicId } })
			: Promise.resolve(undefined),
	]);

	const expenseTotals = db
		.select({
			requisitionId: expensesHeader.requisitionId,
			amount: sql<number>`COALESCE(sum(${expensesDetail.amount}), 0)`.as(
				"amount",
			),
		})
		.from(expensesHeader)
		.innerJoin(expensesDetail, eq(expensesHeader.id, expensesDetail.expenseId))
		.where(
			and(
				eq(expensesHeader.congregationId, congregationId),
				isNull(expensesHeader.deletedAt),
			),
		)
		.groupBy(expensesHeader.requisitionId)
		.as("expense_totals");

	const remainingAmount = sql<number>`CAST(${fundRequisitions.amountApproved} AS numeric) - COALESCE(${expenseTotals.amount}, 0)`;

	return db
		.select({
			value: fundRequisitions.publicId,
			requisitionNo: fundRequisitions.requisitionNo,
			purpose: fundRequisitions.purpose,
			remainingAmount,
		})
		.from(fundRequisitions)
		.leftJoin(
			expenseTotals,
			eq(fundRequisitions.id, expenseTotals.requisitionId),
		)
		.where(
			and(
				eq(fundRequisitions.congregationId, congregationId),
				eq(fundRequisitions.status, "approved"),
				eq(fundRequisitions.requestType, expenseType),
				isNull(fundRequisitions.deletedAt),
				expenseType === "group"
					? eq(fundRequisitions.groupId, groupId ?? -1)
					: undefined,
				expenseType === "district"
					? eq(fundRequisitions.districtId, districtId ?? -1)
					: undefined,
				sql`${remainingAmount} > 0`,
			),
		)
		.orderBy(desc(fundRequisitions.requisitionNo));
};

const getRequisitionExpenseTotal = async ({
	connection = db,
	congregationId,
	requisitionId,
}: {
	connection?: typeof db | Transaction;
	congregationId: number;
	requisitionId: number;
}) => {
	const [expenseTotal] = await connection
		.select({
			amount: sql<number>`COALESCE(sum(${expensesDetail.amount}), 0)`.as(
				"amount",
			),
		})
		.from(expensesHeader)
		.innerJoin(expensesDetail, eq(expensesHeader.id, expensesDetail.expenseId))
		.where(
			and(
				eq(expensesHeader.congregationId, congregationId),
				eq(expensesHeader.requisitionId, requisitionId),
				isNull(expensesHeader.deletedAt),
			),
		);

	return Number(expenseTotal?.amount ?? 0);
};

const getExpenseLinesTotal = (lines: ExpenseFormValues["lines"]) => {
	return lines.reduce((total, line) => total + toNumber(line.amount), 0);
};

const getExpenseRequisitionOptionData = async ({
	congregationId,
	requisitionId,
}: {
	congregationId: number;
	requisitionId: string;
}) => {
	const requisition = await getRequisitionByPublicId({ data: requisitionId });
	const expenseTotal = await getRequisitionExpenseTotal({
		congregationId,
		requisitionId: requisition.id,
	});

	return {
		value: requisition.publicId,
		requisitionNo: requisition.requisitionNo,
		purpose: requisition.purpose,
		remainingAmount:
			Number(requisition.amountApproved ?? requisition.amountRequested) -
			expenseTotal,
	};
};

const resolveExpenseReferences = async ({
	expenseType,
	bankId,
	requisitionId,
	groupId,
	districtId,
	sourceAccountId,
}: Pick<
	ExpenseFormValues,
	| "expenseType"
	| "bankId"
	| "requisitionId"
	| "groupId"
	| "districtId"
	| "sourceAccountId"
>) => {
	const [bank, requisition, group, district, sourceAccount] = await Promise.all(
		[
			bankId ? getAccountByPublicId({ data: bankId }) : Promise.resolve(null),
			requisitionId
				? getRequisitionByPublicId({ data: requisitionId })
				: Promise.resolve(null),
			expenseType === "group" && groupId
				? getGroupIdFn({ data: { publicId: groupId } })
				: Promise.resolve(null),
			expenseType === "district" && districtId
				? getDistrictId({ data: { publicId: districtId } })
				: Promise.resolve(null),
			sourceAccountId
				? getAccountByPublicId({ data: sourceAccountId })
				: Promise.resolve(null),
		],
	);

	return {
		bank,
		requisition,
		group,
		district,
		sourceAccount,
	};
};

type ResolvedExpenseReferences = Awaited<
	ReturnType<typeof resolveExpenseReferences>
>;

const validateResolvedRequisition = async ({
	tx,
	congregationId,
	values,
	resolved,
	currentExpense,
}: {
	tx: Transaction;
	congregationId: number;
	values: Pick<
		ExpenseFormValues,
		"expenseType" | "requisitionId" | "groupId" | "districtId" | "lines"
	>;
	resolved: ResolvedExpenseReferences;
	currentExpense?: Awaited<ReturnType<typeof getExpenseByStatus>>;
}) => {
	const { expenseType, requisitionId, lines } = values;
	const { requisition, group, district } = resolved;

	if (expenseType === "church") {
		if (requisitionId) {
			throw new ExpenseValidationError(
				"Church expenses do not use requisitions",
			);
		}
		return;
	}

	if (!requisitionId) return;

	if (!requisition || requisition.publicId !== requisitionId) {
		throw new ExpenseValidationError("Selected requisition is invalid");
	}

	if (requisition.congregationId !== congregationId) {
		throw new ExpenseValidationError(
			"Selected requisition does not belong to this congregation",
		);
	}

	if (requisition.status !== "approved") {
		throw new ExpenseValidationError("Selected requisition is not approved");
	}

	if (requisition.requestType !== expenseType) {
		throw new ExpenseValidationError(
			"Selected requisition does not match the selected expense type",
		);
	}

	if (expenseType === "group" && requisition.groupId !== group) {
		throw new ExpenseValidationError(
			"Selected requisition does not belong to the chosen group",
		);
	}

	if (expenseType === "district" && requisition.districtId !== district) {
		throw new ExpenseValidationError(
			"Selected requisition does not belong to the chosen district",
		);
	}

	const approvedAmount = Number(requisition.amountApproved ?? 0);
	if (approvedAmount <= 0) {
		throw new ExpenseValidationError(
			"Selected requisition does not have an approved amount",
		);
	}

	const submittedTotal = getExpenseLinesTotal(lines);
	const usedAmount = await getRequisitionExpenseTotal({
		connection: tx,
		congregationId,
		requisitionId: requisition.id,
	});

	const currentExpenseAmount =
		currentExpense && currentExpense.requisitionId === requisition.id
			? currentExpense.details.reduce(
					(total, detail) => total + toNumber(detail.amount),
					0,
				)
			: 0;

	const availableAmount = approvedAmount - usedAmount + currentExpenseAmount;

	if (availableAmount < submittedTotal) {
		throw new ExpenseValidationError(
			"Selected requisition has insufficient remaining balance",
		);
	}
};

const buildExpenseDetails = async (
	lines: ExpenseFormValues["lines"],
	expenseId: number,
) => {
	return Promise.all(
		lines.map(async (line) => {
			const account = await getAccountByPublicId({ data: line.accountId });
			return {
				id: nanoid(),
				expenseId,
				accountId: account,
				description: normalizeText(line.description),
				amount: line.amount.toString(),
			};
		}),
	);
};

const createExpense = async (
	values: ExpenseFormValues,
	congregationId: number,
) => {
	const {
		expenseDate,
		expenseType,
		paymentMethod,
		bankId,
		groupId,
		districtId,
		reference,
		requisitionId,
		sourceAccountId,
		lines,
	} = values;

	const [voucherNo, { bank, requisition, group, district, sourceAccount }] =
		await Promise.all([
			getVoucherNo({ expenseDate, congregationId }),
			resolveExpenseReferences({
				expenseType,
				bankId,
				requisitionId,
				groupId,
				districtId,
				sourceAccountId,
			}),
		]);

	try {
		await db.transaction(async (tx) => {
			await validateResolvedRequisition({
				tx,
				congregationId,
				values: {
					expenseType,
					requisitionId,
					groupId,
					districtId,
					lines,
				},
				resolved: {
					bank,
					requisition,
					group,
					district,
					sourceAccount,
				},
			});

			const [header] = await tx
				.insert(expensesHeader)
				.values({
					expenseType,
					voucherNo,
					expenseDate,
					paymentMethod,
					bankId: paymentMethod !== "cash" ? bank : null,
					reference: normalizeText(reference),
					requisitionId: requisition?.id,
					groupId: expenseType === "group" ? group : null,
					districtId: expenseType === "district" ? district : null,
					creditingAccountId: paymentMethod === "cash" ? sourceAccount : null,
					status: "pending",
					paidFromPettyCash:
						paymentMethod === "cash" ? values.paidFromPettyCash : false,
					congregationId,
				})
				.returning({ id: expensesHeader.id });

			if (!header) {
				throw new Error("Failed to create expense header");
			}

			const detail = await buildExpenseDetails(lines, header.id);

			await tx.insert(expensesDetail).values(detail);
		});

		return success(undefined);
	} catch (error) {
		console.error(error);
		if (error instanceof ExpenseValidationError) {
			return failure({
				type: "ValidationError",
				message: error.message,
			});
		}
		return failure({
			type: "ApplicationError",
			message: "Failed to create expense",
		});
	}
};

const updateExpense = async (
	values: ExpenseFormValues,
	congregationId: number,
) => {
	if (!values.id)
		return failure({
			type: "ApplicationError",
			message: "Expense ID is required",
		});
	const expense = await getExpenseByStatus({
		id: values.id,
		congregationId,
	});
	if (!expense)
		return failure({ type: "ApplicationError", message: "Expense not found" });

	const {
		expenseDate,
		expenseType,
		paymentMethod,
		bankId,
		groupId,
		districtId,
		reference,
		requisitionId,
		sourceAccountId,
		lines,
	} = values;

	const { bank, requisition, group, district, sourceAccount } =
		await resolveExpenseReferences({
			expenseType,
			bankId,
			requisitionId,
			groupId,
			districtId,
			sourceAccountId,
		});

	try {
		await db.transaction(async (tx) => {
			await validateResolvedRequisition({
				tx,
				congregationId,
				values: {
					expenseType,
					requisitionId,
					groupId,
					districtId,
					lines,
				},
				resolved: {
					bank,
					requisition,
					group,
					district,
					sourceAccount,
				},
				currentExpense: expense,
			});

			const [header] = await tx
				.update(expensesHeader)
				.set({
					expenseType,
					expenseDate,
					paymentMethod,
					bankId: paymentMethod !== "cash" ? bank : null,
					reference: normalizeText(reference),
					requisitionId: requisition?.id,
					groupId: expenseType === "group" ? group : null,
					districtId: expenseType === "district" ? district : null,
					creditingAccountId: paymentMethod === "cash" ? sourceAccount : null,
					status: "pending",
					paidFromPettyCash:
						paymentMethod === "cash" ? values.paidFromPettyCash : false,
					congregationId,
				})
				.where(eq(expensesHeader.id, expense.id))
				.returning({ id: expensesHeader.id });

			if (!header) {
				throw new Error("Failed to update expense header");
			}

			await tx
				.delete(expensesDetail)
				.where(eq(expensesDetail.expenseId, expense.id));

			const detail = await buildExpenseDetails(lines, header.id);

			await tx.insert(expensesDetail).values(detail);
		});

		return success(undefined);
	} catch (error) {
		console.error(error);
		if (error instanceof ExpenseValidationError) {
			return failure({
				type: "ValidationError",
				message: error.message,
			});
		}
		return failure({
			type: "ApplicationError",
			message: "Failed to create expense",
		});
	}
};

export const getExpenses = createServerFn()
	.inputValidator(expensesPageValidateSearch)
	.middleware([authMiddleware])
	.handler(
		async ({
			data,
			context: {
				user: { congregationId },
			},
		}) => {
			const { status, year, search } = data;
			const where: SQL[] = [];

			if (status && status !== "all") {
				where.push(eq(expensesHeader.status, status));
			}

			if (year) {
				const { startDate, endDate } = await getFinancialYearById({
					data: year,
				});
				where.push(gte(expensesHeader.expenseDate, startDate));
				where.push(lte(expensesHeader.expenseDate, endDate));
			} else {
				const { startDate, endDate } = await getFinancialYearByDate();
				where.push(gte(expensesHeader.expenseDate, startDate));
				where.push(lte(expensesHeader.expenseDate, endDate));
			}

			if (search) {
				const searchFilters = or(
					ilike(expensesHeader.reference, `%${search}%`),
					ilike(
						sql`CAST(${expensesHeader.paymentMethod} AS TEXT)`,
						`%${search}%`,
					),
					ilike(sql`CAST(${expensesHeader.voucherNo} AS TEXT)`, `%${search}%`),
					ilike(
						sql`CAST(${expensesHeader.expenseType} AS TEXT)`,
						`%${search}%`,
					),
					ilike(sql`COALESCE(${districts.districtName}, '')`, `%${search}%`),
					ilike(sql`COALESCE(${groups.groupName}, '')`, `%${search}%`),
					ilike(
						sql`TO_CHAR(${expensesHeader.expenseDate}, 'DD-MM-YYYY')`,
						`%${search}%`,
					),
					ilike(
						sql`TO_CHAR(${expensesHeader.expenseDate}, 'DD/MM/YYYY')`,
						`%${search}%`,
					),
				);
				if (searchFilters) where.push(searchFilters);
			}

			where.push(isNull(expensesHeader.deletedAt));
			where.push(eq(expensesHeader.congregationId, congregationId));

			const detailTotals = db
				.select({
					expenseId: expensesDetail.expenseId,
					amount: sql<number>`sum(${expensesDetail.amount})`.as("amount"),
				})
				.from(expensesDetail)
				.groupBy(expensesDetail.expenseId)
				.as("detail_totals");

			return db
				.select({
					id: expensesHeader.publicId,
					ref: expensesHeader.id,
					reference: expensesHeader.reference,
					expenseDate: expensesHeader.expenseDate,
					voucherNo: expensesHeader.voucherNo,
					paymentMethod: expensesHeader.paymentMethod,
					expenseType: expensesHeader.expenseType,
					costCenter: sql<string>`CASE
                                                WHEN ${expensesHeader.districtId} IS NOT NULL THEN ${districts.districtName}
                                                WHEN ${expensesHeader.groupId} IS NOT NULL THEN ${groups.groupName}
                                                ELSE 'L.C.C'
                                            END`.as("costCenter"),
					status: expensesHeader.status,
					amount: detailTotals.amount,
				})
				.from(expensesHeader)
				.innerJoin(detailTotals, eq(expensesHeader.id, detailTotals.expenseId))
				.leftJoin(districts, eq(expensesHeader.districtId, districts.id))
				.leftJoin(groups, eq(expensesHeader.groupId, groups.id))
				.where(and(...where))
				.orderBy(desc(expensesHeader.voucherNo));
		},
	);

export const getAvailableRequisitionsForExpense = createServerFn()
	.inputValidator(availableExpenseRequisitionsSchema)
	.middleware([authMiddleware])
	.handler(
		async ({
			data,
			context: {
				user: { congregationId },
			},
		}) => {
			return getAvailableRequisitions({
				congregationId,
				expenseType: data.expenseType,
				groupId: data.groupId,
				districtId: data.districtId,
			});
		},
	);

export const getExpenseRequisitionOption = createServerFn()
	.inputValidator(stringSchema("Provide requisition"))
	.middleware([authMiddleware])
	.handler(
		async ({
			data,
			context: {
				user: { congregationId },
			},
		}) => {
			return getExpenseRequisitionOptionData({
				congregationId,
				requisitionId: data,
			});
		},
	);

export const getExpenseByPublicId = createServerFn()
	.middleware([authMiddleware])
	.inputValidator(stringSchema("Expense ID is required"))
	.handler(
		async ({
			data,
			context: {
				user: { congregationId },
			},
		}): Promise<ExpenseFormValues> => {
			const expense = await db.query.expensesHeader.findFirst({
				where: and(
					eq(expensesHeader.publicId, data),
					eq(expensesHeader.congregationId, congregationId),
					isNull(expensesHeader.deletedAt),
				),
				with: {
					details: {
						with: {
							account: { columns: { publicId: true } },
						},
					},
					requisition: { columns: { publicId: true } },
					bank: { columns: { publicId: true } },
					group: { columns: { publicId: true } },
					district: { columns: { publicId: true } },
					creditingAccount: { columns: { publicId: true } },
				},
			});

			if (!expense) throw notFound();

			return {
				id: expense.publicId,
				expenseDate: expense.expenseDate,
				expenseType: expense.expenseType,
				paymentMethod: expense.paymentMethod,
				reference: expense.reference ?? "",
				voucherNo: expense.voucherNo,
				bankId: expense.bank?.publicId ?? null,
				sourceAccountId: expense.creditingAccount?.publicId ?? null,
				requisitionId: expense.requisition?.publicId ?? null,
				groupId: expense.group?.publicId ?? null,
				districtId: expense.district?.publicId ?? null,
				paidFromPettyCash: expense.paidFromPettyCash,
				lines: expense.details.map((detail) => ({
					id: detail.id,
					accountId: detail.account.publicId,
					description: detail.description ?? "",
					amount: toNumber(detail.amount),
				})),
			};
		},
	);

export const deleteExpense = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.inputValidator(stringSchema("Expense ID is required"))
	.handler(
		async ({
			data,
			context: {
				user: { congregationId },
			},
		}) => {
			const expense = await getExpenseByStatus({
				id: data,
				congregationId,
			});

			if (!expense)
				return failure({ type: "NotFoundError", message: "Expense not found" });

			try {
				await db.transaction(async (tx) => {
					await tx
						.delete(expensesDetail)
						.where(eq(expensesDetail.expenseId, expense.id));
					await tx
						.delete(expensesHeader)
						.where(eq(expensesHeader.id, expense.id));

					await deleteJournalEntry({
						source: "Expenses",
						sourceId: expense.id.toString(),
						tx,
					});
					await deleteBankingEntry({
						source: "Expenses",
						congregationId,
						sourceId: expense.id.toString(),
						tx,
					});

					await tx
						.delete(pettyCash)
						.where(
							and(
								eq(pettyCash.congregationId, congregationId),
								eq(pettyCash.source, "Expenses"),
								eq(pettyCash.sourceId, expense.id.toString()),
							),
						);
				});

				return success(undefined);
			} catch (error) {
				console.error(error);
				return failure({
					type: "ApplicationError",
					message: "Failed to delete expense",
				});
			}
		},
	);

export const approveExpense = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.inputValidator(stringSchema("Provide expense to approve"))
	.handler(
		async ({
			data,
			context: {
				user: { congregationId },
			},
		}) => {
			const expense = await getExpenseByStatus({
				id: data,
				congregationId,
			});
			if (!expense)
				return failure({
					type: "NotFoundError",
					message: "Cannot approve this expense!",
				});

			const narration = `Expense voucher #${expense.voucherNo}`;

			const journalLines = expense.details.map((l, index) => ({
				accountId: l.accountId,
				amount: l.amount,
				dc: "debit" as DebitCredit,
				lineNumber: index + 1,
				memo: l.description,
				reference: narration,
			}));

			const creditingAccount =
				expense.paymentMethod === "cash"
					? expense.creditingAccountId
					: expense.bankId;
			if (!creditingAccount)
				return failure({
					type: "ApplicationError",
					message: "Unable to find a crediting account",
				});

			const expenseAmount = expense.details.reduce(
				(acc, cur) => acc + toNumber(cur.amount),
				0,
			);

			journalLines.push({
				accountId: creditingAccount,
				amount: expenseAmount.toString(),
				dc: "credit" as DebitCredit,
				lineNumber: journalLines.length + 1,
				memo: narration,
				reference: narration,
			});

			if (!areJournalValuesBalanced(journalLines))
				return failure({
					type: "ApplicationError",
					message:
						"This expense's journal entries are not balancing, please review the details before approving",
				});

			try {
				await db.transaction(async (tx) => {
					await tx
						.update(expensesHeader)
						.set({ status: "approved" })
						.where(
							and(
								eq(expensesHeader.id, expense.id),
								eq(expensesHeader.congregationId, congregationId),
								eq(expensesHeader.status, "pending"),
								isNull(expensesHeader.deletedAt),
							),
						);

					if (expense.paidFromPettyCash) {
						await tx.insert(pettyCash).values({
							transactionDate: expense.expenseDate,
							dc: "credit",
							narration,
							reference: expense.reference ?? narration,
							source: "Expenses",
							sourceId: expense.id.toString(),
							congregationId,
							amount: expenseAmount.toString(),
						});
					}

					await createJournalEntry({
						entry: {
							transactionDate: expense.expenseDate,
							congregationId,
							source: "Expenses",
							sourceId: expense.id.toString(),
						},
						lines: journalLines,
						tx,
					});

					if (expense.paymentMethod !== "cash" && expense.bankId) {
						await createBankingEntry({
							entry: {
								bankId: expense.bankId,
								congregationId,
								amount: expenseAmount.toString(),
								transactionDate: expense.expenseDate,
								dc: "credit",
								reference: expense.reference ?? narration,
								transactionMethod: "withdrawal",
								source: "Expenses",
								sourceId: expense.id.toString(),
								narration,
							},
							tx,
						});
					}
				});

				return success(undefined);
			} catch (error) {
				console.error(error);
				return failure({
					type: "ApplicationError",
					message: "Something went wrong while approving this expense",
				});
			}
		},
	);

// TODO: HANDLE CAPTURING OF PETTY CASH INSIDE PETTY CASH TABLE

export const unapproveExpense = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.inputValidator(stringSchema("Provide expense to unapprove"))
	.handler(
		async ({
			data,
			context: {
				user: { congregationId },
			},
		}) => {
			const expense = await getExpenseByStatus({
				id: data,
				congregationId,
				status: "approved",
			});
			if (!expense)
				return failure({
					type: "NotFoundError",
					message: "Cannot unapprove this expense!",
				});

			try {
				await db.transaction(async (tx) => {
					await tx
						.update(expensesHeader)
						.set({ status: "pending" })
						.where(eq(expensesHeader.id, expense.id));

					await deleteJournalEntry({
						source: "Expenses",
						sourceId: expense.id.toString(),
						tx,
					});

					await tx
						.delete(pettyCash)
						.where(
							and(
								eq(pettyCash.congregationId, congregationId),
								eq(pettyCash.sourceId, expense.id.toString()),
								eq(pettyCash.source, "Expenses"),
							),
						);

					await deleteBankingEntry({
						source: "Expenses",
						sourceId: expense.id.toString(),
						congregationId,
						tx,
					});
				});

				return success(undefined);
			} catch (error) {
				console.error(error);
				return failure({
					type: "ApplicationError",
					message: "Something went wrong while unapproving this expense",
				});
			}
		},
	);

export const upsertExpense = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.inputValidator(expenseFormSchema)
	.handler(
		async ({
			data,
			context: {
				user: { congregationId },
			},
		}) => {
			const action = data.id ? updateExpense : createExpense;
			return await action(data, congregationId);
		},
	);

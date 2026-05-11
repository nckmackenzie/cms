import { notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import {
	and,
	desc,
	eq,
	gte,
	ilike,
	isNull,
	lte,
	or,
	type SQL,
	sql,
} from "drizzle-orm";
import { db } from "#/db";
import { type DebitCredit, ledgerAccounts, pettyCash } from "#/db/schema";
import { getAccountByPublicId } from "#/features/coa/services/coa.api";
import { getFinancialYearByDate } from "#/features/fiscal-years/services/years.api";
import {
	type PettyCashReceiptValues,
	pettyCashFormSchema,
	pettyCashValidateSearch,
} from "#/features/petty-cash/utils/schemas";
import { createBankingEntry, deleteBankingEntry } from "#/lib/banking";
import {
	dateFormat,
	normalizeDateRange,
	normalizeText,
	toNumber,
} from "#/lib/helpers";
import {
	createJournalEntry,
	deleteJournalEntry,
	type Transaction,
} from "#/lib/journal";
import { failure, success } from "#/lib/result";
import { stringSchema } from "#/lib/schemas";
import { authMiddleware } from "#/middleware/auth";

const buildPettyCashJournalLines = (values: {
	amount: number;
	reference: string;
	description?: string;
	destinationAccountId: number;
	bankAccountId: number;
}) => {
	const memo =
		normalizeText(values.description) ?? normalizeText(values.reference);
	const amount = values.amount.toString();

	return [
		{
			accountId: values.destinationAccountId,
			amount,
			dc: "debit" as DebitCredit,
			lineNumber: 1,
			memo,
			reference: values.reference,
		},
		{
			accountId: values.bankAccountId,
			amount,
			dc: "credit" as DebitCredit,
			lineNumber: 2,
			memo,
			reference: values.reference,
		},
	];
};

const getPettyCashReceiptNo = async ({
	congregationId,
	receiptDate,
	tx,
}: {
	congregationId: number;
	receiptDate: string;
	tx?: Transaction;
}) => {
	const connection = tx ?? db;
	const fiscalYear = await getFinancialYearByDate({ data: receiptDate });

	const result = await connection
		.select({
			receiptNo: sql<number>`MAX(${pettyCash.receiptNo})`,
		})
		.from(pettyCash)
		.where(
			and(
				eq(pettyCash.congregationId, congregationId),
				eq(pettyCash.isReceipt, true),
				gte(pettyCash.transactionDate, fiscalYear.startDate),
				lte(pettyCash.transactionDate, fiscalYear.endDate),
				isNull(pettyCash.deletedAt),
			),
		);

	return (result[0]?.receiptNo || 0) + 1;
};

export const getPettyCashReceipts = createServerFn()
	.middleware([authMiddleware])
	.inputValidator(pettyCashValidateSearch)
	.handler(
		async ({
			data: { search, dateRange },
			context: {
				user: { congregationId },
			},
		}) => {
			const filters: Array<SQL> = [];

			if (search) {
				const s = search.trim();
				if (s.length > 0) {
					const searchFilters = or(
						ilike(sql`CAST(${pettyCash.receiptNo} AS TEXT)`, `%${s}%`),
						ilike(sql`COALESCE(${pettyCash.reference}, '')`, `%${s}%`),
						ilike(sql`COALESCE(${pettyCash.narration}, '')`, `%${s}%`),
					);
					if (searchFilters) filters.push(searchFilters);
				}
			}

			if (dateRange) {
				const { from, to } = normalizeDateRange(dateRange.from, dateRange.to);
				filters.push(
					gte(pettyCash.transactionDate, from),
					lte(pettyCash.transactionDate, to),
				);
			} else {
				const fiscalYear = await getFinancialYearByDate();
				filters.push(
					gte(pettyCash.transactionDate, fiscalYear.startDate),
					lte(pettyCash.transactionDate, fiscalYear.endDate),
				);
			}

			return db
				.select({
					id: pettyCash.publicId,
					receiptNo: pettyCash.receiptNo,
					receiptDate: pettyCash.transactionDate,
					amount: pettyCash.amount,
					bank: ledgerAccounts.name,
					bankAccountNo: ledgerAccounts.accountNo,
					reference: pettyCash.reference,
					description: pettyCash.narration,
				})
				.from(pettyCash)
				.leftJoin(ledgerAccounts, eq(pettyCash.bankId, ledgerAccounts.id))
				.where(
					and(
						eq(pettyCash.congregationId, congregationId),
						eq(pettyCash.isReceipt, true),
						isNull(pettyCash.deletedAt),
						filters.length > 0 ? and(...filters) : undefined,
					),
				)
				.orderBy(desc(pettyCash.receiptNo));
		},
	);

export const getPettyCashReceipt = createServerFn()
	.middleware([authMiddleware])
	.inputValidator((pettyCashId: string) => pettyCashId)
	.handler(
		async ({
			data: pettyCashId,
			context: {
				user: { congregationId },
			},
		}) => {
			const receipt = await db.query.pettyCash.findFirst({
				columns: {
					id: true,
					publicId: true,
					transactionDate: true,
					amount: true,
					bankId: true,
					reference: true,
					narration: true,
					debitingAccountId: true,
				},
				with: {
					bank: {
						columns: {
							publicId: true,
						},
					},
					debitingAccount: {
						columns: {
							publicId: true,
						},
					},
				},
				where: and(
					eq(pettyCash.publicId, pettyCashId),
					eq(pettyCash.congregationId, congregationId),
					eq(pettyCash.isReceipt, true),
					isNull(pettyCash.deletedAt),
				),
			});

			if (!receipt) {
				throw notFound();
			}

			return {
				id: receipt.publicId,
				receiptDate: dateFormat(receipt.transactionDate),
				amount: toNumber(receipt.amount),
				bankId: receipt.bank?.publicId ?? "",
				reference: receipt.reference ?? "",
				description: receipt.narration ?? undefined,
				creditingAccountId: receipt.debitingAccount?.publicId ?? "",
			} satisfies PettyCashReceiptValues;
		},
	);

const createPettyCashReceipt = async (
	values: PettyCashReceiptValues,
	congregationId: number,
) => {
	const [bankAccountId, destinationAccountId] = await Promise.all([
		getAccountByPublicId({ data: values.bankId }),
		getAccountByPublicId({ data: values.creditingAccountId }),
	]);

	try {
		await db.transaction(async (tx) => {
			const receiptNo = await getPettyCashReceiptNo({
				congregationId,
				receiptDate: values.receiptDate,
				tx,
			});

			const [created] = await tx
				.insert(pettyCash)
				.values({
					receiptNo,
					transactionDate: values.receiptDate,
					amount: values.amount.toString(),
					dc: "debit",
					isReceipt: true,
					bankId: bankAccountId,
					reference: normalizeText(values.reference),
					narration: normalizeText(values.description),
					debitingAccountId: destinationAccountId,
					congregationId,
				})
				.returning({ id: pettyCash.id });

			const sourceId = created.id.toString();

			await createJournalEntry({
				congregationId,
				transactionDate: values.receiptDate,
				lines: buildPettyCashJournalLines({
					amount: values.amount,
					reference: values.reference,
					description: values.description,
					destinationAccountId,
					bankAccountId,
				}),
				source: { source: "Petty Cash", sourceId },
				tx,
			});

			await createBankingEntry({
				entry: {
					transactionDate: values.receiptDate,
					bankId: bankAccountId,
					dc: "credit",
					amount: values.amount.toString(),
					transactionMethod: "withdrawal",
					reference: values.reference,
					counterAccountId: destinationAccountId,
					narration:
						normalizeText(values.description) ??
						normalizeText(values.reference),
					source: "Petty Cash",
					sourceId,
					congregationId,
				},
				tx,
			});
		});

		return success(undefined);
	} catch (error) {
		console.error(error);
		return failure({
			type: "ApplicationError",
			message: "Failed to create petty cash receipt",
		});
	}
};

const updatePettyCashReceipt = async (
	values: PettyCashReceiptValues & { id: string },
	congregationId: number,
) => {
	const receipt = await db.query.pettyCash.findFirst({
		columns: { id: true, publicId: true, receiptNo: true },
		where: and(
			eq(pettyCash.publicId, values.id),
			eq(pettyCash.congregationId, congregationId),
			eq(pettyCash.isReceipt, true),
			isNull(pettyCash.deletedAt),
		),
	});

	if (!receipt) {
		return failure({
			type: "NotFoundError",
			message: "Petty cash receipt not found",
		});
	}

	const [bankAccountId, destinationAccountId] = await Promise.all([
		getAccountByPublicId({ data: values.bankId }),
		getAccountByPublicId({ data: values.creditingAccountId }),
	]);

	const sourceId = receipt.id.toString();

	try {
		await db.transaction(async (tx) => {
			await tx
				.update(pettyCash)
				.set({
					transactionDate: values.receiptDate,
					amount: values.amount.toString(),
					bankId: bankAccountId,
					reference: normalizeText(values.reference),
					narration: normalizeText(values.description),
					debitingAccountId: destinationAccountId,
				})
				.where(eq(pettyCash.id, receipt.id));

			await deleteJournalEntry({
				source: "Petty Cash",
				sourceId,
				tx,
			});

			await createJournalEntry({
				congregationId,
				transactionDate: values.receiptDate,
				lines: buildPettyCashJournalLines({
					amount: values.amount,
					reference: values.reference,
					description: values.description,
					destinationAccountId,
					bankAccountId,
				}),
				source: { source: "Petty Cash", sourceId },
				tx,
			});

			await deleteBankingEntry({
				source: "Petty Cash",
				sourceId,
				congregationId,
				tx,
			});

			await createBankingEntry({
				entry: {
					transactionDate: values.receiptDate,
					bankId: bankAccountId,
					dc: "credit",
					amount: values.amount.toString(),
					transactionMethod: "withdrawal",
					reference: values.reference,
					counterAccountId: destinationAccountId,
					narration:
						normalizeText(values.description) ??
						normalizeText(values.reference),
					source: "Petty Cash",
					sourceId,
					congregationId,
				},
				tx,
			});
		});

		return success(undefined);
	} catch (error) {
		console.error(error);
		return failure({
			type: "ApplicationError",
			message: "Failed to update petty cash receipt",
		});
	}
};

export const upsertPettyCashReceipt = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.inputValidator(pettyCashFormSchema)
	.handler(
		async ({
			data,
			context: {
				user: { congregationId },
			},
		}) => {
			if (data.id) {
				return await updatePettyCashReceipt(
					{ ...(data as PettyCashReceiptValues), id: data.id },
					congregationId,
				);
			}

			return await createPettyCashReceipt(data, congregationId);
		},
	);

export const deletePettyCashReceipt = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.inputValidator(stringSchema("Petty cash receipt is required"))
	.handler(
		async ({
			data,
			context: {
				user: { congregationId },
			},
		}) => {
			const pettyCashReceipt = await db.query.pettyCash.findFirst({
				where: and(
					eq(pettyCash.publicId, data),
					eq(pettyCash.congregationId, congregationId),
					eq(pettyCash.isReceipt, true),
					isNull(pettyCash.deletedAt),
				),
			});

			if (!pettyCashReceipt) {
				return failure({
					type: "NotFoundError",
					message: "Petty cash receipt not found",
				});
			}

			const sourceId = pettyCashReceipt.id.toString();

			try {
				await db.transaction(async (tx) => {
					await tx
						.delete(pettyCash)
						.where(eq(pettyCash.id, pettyCashReceipt.id));

					await deleteJournalEntry({
						source: "Petty Cash",
						sourceId,
						tx,
					});

					await deleteBankingEntry({
						source: "Petty Cash",
						sourceId,
						congregationId,
						tx,
					});
				});

				return success(undefined);
			} catch (error) {
				console.error(error);
				return failure({
					type: "ApplicationError",
					message: "Failed to delete petty cash receipt",
				});
			}
		},
	);

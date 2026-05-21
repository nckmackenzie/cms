import { notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { and, eq, gte, isNull, lte, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "#/db";
import { journalEntries } from "#/db/schema";
import { getAccountByPublicId } from "#/features/coa/services/coa.api";
import { getFinancialYearByDate } from "#/features/fiscal-years/services/years.api";
import { dateFormat, normalizeText } from "#/lib/helpers";
import {
	areJournalValuesBalanced,
	createJournalEntry,
	type Transaction,
} from "#/lib/journal";
import { failure, success } from "#/lib/result";
import { authMiddleware } from "#/middleware/auth";
import { type JournalEntry, journalEntrySchema } from "../utils/schemas";

const JOURNAL_ENTRY_SOURCE = "Journal Entries";

const journalDateInputSchema = z.iso.date().optional();

const journalEntryInputSchema = z.object({
	journalNo: z.number(),
	date: z.iso.date().optional(),
});

const deleteJournalEntryInputSchema = z.object({
	journalNo: z.number(),
	date: z.iso.date(),
});

const getNextJournalNo = async ({
	congregationId,
	date,
	tx,
}: {
	congregationId: number;
	date?: string;
	tx?: Transaction;
}) => {
	const connection = tx ?? db;
	const fiscalYear = await getFinancialYearByDate({
		data: date ?? dateFormat(new Date()),
	});

	const [{ journalNo } = { journalNo: null }] = await connection
		.select({
			journalNo: sql<number | null>`MAX(${journalEntries.journalNo})`,
		})
		.from(journalEntries)
		.where(
			and(
				eq(journalEntries.source, JOURNAL_ENTRY_SOURCE),
				eq(journalEntries.congregationId, congregationId),
				gte(journalEntries.transactionDate, fiscalYear.startDate),
				lte(journalEntries.transactionDate, fiscalYear.endDate),
				isNull(journalEntries.deletedAt),
			),
		);

	return (journalNo ?? 0) + 1;
};

export const getJournalNo = createServerFn()
	.middleware([authMiddleware])
	.inputValidator(journalDateInputSchema)
	.handler(
		async ({
			data: date,
			context: {
				user: { congregationId },
			},
		}) => {
			return getNextJournalNo({ congregationId, date });
		},
	);

export const upsertJournalEntries = createServerFn()
	.middleware([authMiddleware])
	.inputValidator(journalEntrySchema)
	.handler(
		async ({
			data,
			context: {
				user: { congregationId },
			},
		}) => {
			const { journalLines: lines, date, id } = data;

			const formattedJournalLines = await Promise.all(
				lines.map(async (line, index) => {
					const accountId = await getAccountByPublicId({
						data: line.accountId,
					});
					const amount =
						line.debit && line.debit > 0 ? line.debit : (line.credit ?? 0);
					const dc: "debit" | "credit" =
						amount === 0 ? "debit" : line.debit ? "debit" : "credit";
					return {
						accountId,
						dc,
						amount: amount.toString(),
						memo: normalizeText(line.description),
						lineNumber: index + 1,
					};
				}),
			);

			if (!areJournalValuesBalanced(formattedJournalLines)) {
				return failure({
					type: "ValidationError",
					message: "Debits and credits must be equal",
				});
			}

			try {
				await db.transaction(async (tx) => {
					if (!id) {
						const journalNo = await getNextJournalNo({
							congregationId,
							date,
							tx,
						});
						await createJournalEntry({
							congregationId,
							transactionDate: date,
							journalNo,
							source: {
								source: JOURNAL_ENTRY_SOURCE,
								sourceId: journalNo.toString(),
							},
							lines: formattedJournalLines,
							tx,
						});
					} else {
						const fiscalYear = await getFinancialYearByDate({ data: date });
						const journalEntry = await tx.query.journalEntries.findFirst({
							where: and(
								eq(journalEntries.journalNo, +id),
								eq(journalEntries.congregationId, congregationId),
								eq(journalEntries.source, JOURNAL_ENTRY_SOURCE),
								gte(journalEntries.transactionDate, fiscalYear.startDate),
								lte(journalEntries.transactionDate, fiscalYear.endDate),
								isNull(journalEntries.deletedAt),
							),
						});

						if (!journalEntry) {
							return failure({
								type: "NotFoundError",
								message: "Journal entry not found",
							});
						}

						await tx
							.delete(journalEntries)
							.where(
								and(
									eq(journalEntries.journalNo, +id),
									eq(journalEntries.congregationId, congregationId),
									eq(journalEntries.source, JOURNAL_ENTRY_SOURCE),
									gte(journalEntries.transactionDate, fiscalYear.startDate),
									lte(journalEntries.transactionDate, fiscalYear.endDate),
									isNull(journalEntries.deletedAt),
								),
							);

						await createJournalEntry({
							congregationId,
							transactionDate: date,
							journalNo: +id,
							source: {
								source: JOURNAL_ENTRY_SOURCE,
								sourceId: id.toString(),
							},
							lines: formattedJournalLines,
							tx,
						});
					}
				});

				return success(undefined);
			} catch (error) {
				console.error(error);
				return failure({
					type: "ApplicationError",
					message: "Something went wrong while performing this action",
				});
			}
		},
	);

export const getJournalEntries = createServerFn()
	.middleware([authMiddleware])
	.inputValidator(journalEntryInputSchema)
	.handler(
		async ({
			data: { journalNo, date },
			context: {
				user: { congregationId },
			},
		}) => {
			const fiscalYear = await getFinancialYearByDate({
				data: date ?? dateFormat(new Date()),
			});
			const journalEntry = await db.query.journalEntries.findMany({
				columns: { source: false, sourceId: false, deletedAt: false },
				where: and(
					eq(journalEntries.journalNo, journalNo),
					eq(journalEntries.congregationId, congregationId),
					eq(journalEntries.source, JOURNAL_ENTRY_SOURCE),
					gte(journalEntries.transactionDate, fiscalYear.startDate),
					lte(journalEntries.transactionDate, fiscalYear.endDate),
					isNull(journalEntries.deletedAt),
				),
				with: {
					account: { columns: { publicId: true } },
				},
			});

			if (journalEntry.length === 0 || !journalEntry[0].journalNo) {
				throw notFound();
			}

			return {
				date: journalEntry[0].transactionDate,
				id: journalEntry[0].journalNo.toString(),
				journalNo: journalEntry[0].journalNo,
				journalLines: journalEntry.map((line) => ({
					id: line.id.toString(),
					accountId: line.account.publicId,
					debit: line.dc === "debit" ? +line.amount : undefined,
					credit: line.dc === "credit" ? +line.amount : undefined,
					description: line.memo,
				})),
			} satisfies JournalEntry;
		},
	);

export const deleteJournalEntry = createServerFn()
	.middleware([authMiddleware])
	.inputValidator(deleteJournalEntryInputSchema)
	.handler(
		async ({
			data: { journalNo, date },
			context: {
				user: { congregationId },
			},
		}) => {
			const fiscalYear = await getFinancialYearByDate({ data: date });
			const journal = await db.query.journalEntries.findFirst({
				columns: { journalNo: true },
				where: and(
					eq(journalEntries.journalNo, journalNo),
					eq(journalEntries.congregationId, congregationId),
					eq(journalEntries.source, JOURNAL_ENTRY_SOURCE),
					gte(journalEntries.transactionDate, fiscalYear.startDate),
					lte(journalEntries.transactionDate, fiscalYear.endDate),
					isNull(journalEntries.deletedAt),
				),
			});

			if (!journal) {
				return failure({
					type: "NotFoundError",
					message: "Trying to delete a journal that cannot be found!",
				});
			}

			await db
				.delete(journalEntries)
				.where(
					and(
						eq(journalEntries.journalNo, journalNo),
						eq(journalEntries.congregationId, congregationId),
						eq(journalEntries.source, JOURNAL_ENTRY_SOURCE),
						gte(journalEntries.transactionDate, fiscalYear.startDate),
						lte(journalEntries.transactionDate, fiscalYear.endDate),
						isNull(journalEntries.deletedAt),
					),
				);

			return success(undefined);
		},
	);

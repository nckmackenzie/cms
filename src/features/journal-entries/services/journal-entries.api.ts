import { notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { and, desc, eq, gte, isNull, lte, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "#/db";
import { journalEntriesHeaders, journalEntryLines } from "#/db/schema";
import { getAccountByPublicId } from "#/features/coa/services/coa.api";
import { getFinancialYearByDate } from "#/features/fiscal-years/services/years.api";
import {
	type JournalEntry,
	journalEntrySchema,
} from "#/features/journal-entries/utils/schemas";
import { dateFormat, normalizeText } from "#/lib/helpers";
import {
	areJournalValuesBalanced,
	createJournalEntry,
	type Transaction,
} from "#/lib/journal";
import { failure, success } from "#/lib/result";
import { authMiddleware } from "#/middleware/auth";

const JOURNAL_ENTRY_SOURCE = "Journal Entries";

const journalDateInputSchema = z.iso.date().optional();

const journalEntryInputSchema = z.object({
	publicId: z.uuid(),
});

const deleteJournalEntryInputSchema = z.object({
	publicId: z.uuid(),
});

const journalSearchInputSchema = z.object({
	dateRange: z
		.object({
			from: z.iso.date(),
			to: z.iso.date(),
		})
		.superRefine((data, ctx) => {
			if (new Date(data.from) > new Date(data.to)) {
				ctx.addIssue({
					code: "custom",
					message: "From date must be before to date",
					path: ["from"],
				});
			}
		}),
});

export type JournalSearchInput = z.infer<typeof journalSearchInputSchema>;

export type JournalSearchResult = {
	publicId: string;
	transactionDate: string;
	journalNo: number;
	amount: string;
};

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
			journalNo: sql<number | null>`MAX(${journalEntriesHeaders.journalNo})`,
		})
		.from(journalEntriesHeaders)
		.where(
			and(
				eq(journalEntriesHeaders.source, JOURNAL_ENTRY_SOURCE),
				eq(journalEntriesHeaders.congregationId, congregationId),
				gte(journalEntriesHeaders.transactionDate, fiscalYear.startDate),
				lte(journalEntriesHeaders.transactionDate, fiscalYear.endDate),
				isNull(journalEntriesHeaders.deletedAt),
			),
		);

	return (journalNo ?? 0) + 1;
};

export const getJournalNo = createServerFn()
	.middleware([authMiddleware])
	.validator(journalDateInputSchema)
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

export const upsertJournalEntries = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.validator(journalEntrySchema)
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
					const debit = line.debit ?? 0;
					const credit = line.credit ?? 0;
					const isDebit = debit > 0;
					const amount = isDebit ? debit : credit;
					const dc: "debit" | "credit" = isDebit ? "debit" : "credit";
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
				const result = await db.transaction(async (tx) => {
					if (!id) {
						const journalNo = await getNextJournalNo({
							congregationId,
							date,
							tx,
						});
						await createJournalEntry({
							entry: {
								congregationId,
								transactionDate: date,
								journalNo,
								source: JOURNAL_ENTRY_SOURCE,
								sourceId: journalNo.toString(),
							},
							lines: formattedJournalLines,
							tx,
						});
						return success(undefined);
					} else {
						const journalEntry = await tx.query.journalEntriesHeaders.findFirst(
							{
								columns: { id: true, journalNo: true, transactionDate: true },
								where: and(
									eq(journalEntriesHeaders.publicId, id),
									eq(journalEntriesHeaders.congregationId, congregationId),
									eq(journalEntriesHeaders.source, JOURNAL_ENTRY_SOURCE),
									isNull(journalEntriesHeaders.deletedAt),
								),
							},
						);

						if (!journalEntry) {
							return failure({
								type: "NotFoundError",
								message: "Journal entry not found",
							});
						}

						const [currentFiscalYear, updatedFiscalYear] = await Promise.all([
							getFinancialYearByDate({
								data: journalEntry.transactionDate,
							}),
							getFinancialYearByDate({ data: date }),
						]);
						const movedFiscalYears =
							currentFiscalYear.startDate !== updatedFiscalYear.startDate ||
							currentFiscalYear.endDate !== updatedFiscalYear.endDate;
						const journalNo = movedFiscalYears
							? await getNextJournalNo({ congregationId, date, tx })
							: journalEntry.journalNo;

						await tx
							.update(journalEntriesHeaders)
							.set({
								transactionDate: date,
								journalNo,
								sourceId: journalNo?.toString(),
							})
							.where(eq(journalEntriesHeaders.id, journalEntry.id));

						await tx
							.delete(journalEntryLines)
							.where(eq(journalEntryLines.journalId, journalEntry.id));

						await tx.insert(journalEntryLines).values(
							formattedJournalLines.map((line) => ({
								...line,
								journalId: journalEntry.id,
							})),
						);
						return success(undefined);
					}
				});

				return result;
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
	.validator(journalEntryInputSchema)
	.handler(
		async ({
			data: { publicId },
			context: {
				user: { congregationId },
			},
		}) => {
			const journalEntry = await db.query.journalEntriesHeaders.findFirst({
				columns: {
					publicId: true,
					transactionDate: true,
					journalNo: true,
				},
				where: and(
					eq(journalEntriesHeaders.publicId, publicId),
					eq(journalEntriesHeaders.congregationId, congregationId),
					eq(journalEntriesHeaders.source, JOURNAL_ENTRY_SOURCE),
					isNull(journalEntriesHeaders.deletedAt),
				),
				with: {
					lines: {
						orderBy: (lines, { asc }) => [asc(lines.lineNumber)],
						with: {
							account: { columns: { publicId: true } },
						},
					},
				},
			});

			if (
				!journalEntry ||
				!journalEntry.journalNo ||
				journalEntry.lines.length === 0
			) {
				throw notFound();
			}

			return {
				date: journalEntry.transactionDate,
				id: journalEntry.publicId,
				journalNo: journalEntry.journalNo,
				journalLines: journalEntry.lines.map((line) => ({
					id: line.id.toString(),
					accountId: line.account.publicId,
					debit: line.dc === "debit" ? +line.amount : undefined,
					credit: line.dc === "credit" ? +line.amount : undefined,
					description: line.memo,
				})),
			} satisfies JournalEntry;
		},
	);

export const searchJournalEntries = createServerFn()
	.middleware([authMiddleware])
	.validator(journalSearchInputSchema)
	.handler(
		async ({
			data: {
				dateRange: { from, to },
			},
			context: {
				user: { congregationId },
			},
		}) => {
			const rows = await db
				.select({
					publicId: journalEntriesHeaders.publicId,
					transactionDate: journalEntriesHeaders.transactionDate,
					journalNo: journalEntriesHeaders.journalNo,
					amount: sql<string>`COALESCE(SUM(CASE WHEN ${journalEntryLines.dc} = 'debit' THEN ${journalEntryLines.amount} ELSE 0 END), 0)`,
				})
				.from(journalEntriesHeaders)
				.innerJoin(
					journalEntryLines,
					eq(journalEntriesHeaders.id, journalEntryLines.journalId),
				)
				.where(
					and(
						eq(journalEntriesHeaders.congregationId, congregationId),
						eq(journalEntriesHeaders.source, JOURNAL_ENTRY_SOURCE),
						gte(journalEntriesHeaders.transactionDate, from),
						lte(journalEntriesHeaders.transactionDate, to),
						isNull(journalEntriesHeaders.deletedAt),
					),
				)
				.groupBy(
					journalEntriesHeaders.id,
					journalEntriesHeaders.publicId,
					journalEntriesHeaders.transactionDate,
					journalEntriesHeaders.journalNo,
				)
				.orderBy(
					desc(journalEntriesHeaders.transactionDate),
					desc(journalEntriesHeaders.journalNo),
				);

			return rows.filter(
				(row): row is JournalSearchResult => row.journalNo !== null,
			);
		},
	);

export const deleteJournalEntry = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.validator(deleteJournalEntryInputSchema)
	.handler(
		async ({
			data: { publicId },
			context: {
				user: { congregationId },
			},
		}) => {
			const journal = await db.query.journalEntriesHeaders.findFirst({
				columns: { id: true },
				where: and(
					eq(journalEntriesHeaders.publicId, publicId),
					eq(journalEntriesHeaders.congregationId, congregationId),
					eq(journalEntriesHeaders.source, JOURNAL_ENTRY_SOURCE),
					isNull(journalEntriesHeaders.deletedAt),
				),
			});

			if (!journal) {
				return failure({
					type: "NotFoundError",
					message: "Trying to delete a journal that cannot be found!",
				});
			}

			await db
				.delete(journalEntriesHeaders)
				.where(
					and(
						eq(journalEntriesHeaders.id, journal.id),
						eq(journalEntriesHeaders.congregationId, congregationId),
						eq(journalEntriesHeaders.source, JOURNAL_ENTRY_SOURCE),
						isNull(journalEntriesHeaders.deletedAt),
					),
				);

			return success(undefined);
		},
	);

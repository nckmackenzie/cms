import type { ExtractTablesWithRelations } from "drizzle-orm";
import { and, eq, isNull } from "drizzle-orm";
import type { NodePgQueryResultHKT } from "drizzle-orm/node-postgres";
import type { PgTransaction } from "drizzle-orm/pg-core";
import type { Source } from "#/lib/constants";
import { db } from "@/db";
import type * as schema from "@/db/schema";
import {
	journalEntries,
	journalEntriesHeaders,
	journalEntryLines,
	ledgerAccounts,
} from "@/db/schema";

export type Transaction = PgTransaction<
	NodePgQueryResultHKT,
	typeof schema,
	ExtractTablesWithRelations<typeof schema>
>;

type CreateJournalEntryParams = {
	entry: Pick<
		typeof journalEntriesHeaders.$inferInsert,
		"congregationId" | "journalNo" | "transactionDate" | "source" | "sourceId"
	>;
	lines: Omit<typeof journalEntryLines.$inferInsert, "id" | "journalId">[];
	tx?: Transaction;
};

export const createJournalEntry = async ({
	entry,
	lines,
	tx,
}: CreateJournalEntryParams) => {
	const connection = tx ?? db;

	const [{ id: journalId }] = await connection
		.insert(journalEntriesHeaders)
		.values(entry)
		.returning({ id: journalEntries.id });

	if (lines.length > 0) {
		await connection.insert(journalEntryLines).values(
			lines.map((line) => ({
				...line,
				journalId: journalId,
			})),
		);
	}
	return journalId;

	// if (lines.length > 0) {
	// 	await connection.insert(journalEntries).values(
	// 		lines.map((line) => ({
	// 			...line,
	// 			source,
	// 			sourceId,
	// 			transactionDate,
	// 			congregationId,
	// 			journalNo,
	// 		})),
	// 	);
	// }

	// return { source, sourceId };
};

type DeleteJournalEntryParams = {
	id?: number;
	source?: Source;
	sourceId?: string;
	tx?: Transaction;
};

export const deleteJournalEntry = async ({
	id,
	source,
	sourceId,
	tx,
}: DeleteJournalEntryParams) => {
	const connection = tx ?? db;

	const filters = [];
	if (id) filters.push(eq(journalEntriesHeaders.id, id));
	if (source) filters.push(eq(journalEntriesHeaders.source, source));
	if (sourceId) filters.push(eq(journalEntriesHeaders.sourceId, sourceId));

	if (filters.length === 0) {
		throw new Error("No criteria provided for deleting journal entry");
	}

	await connection
		.delete(journalEntriesHeaders)
		.where(and(...filters))
		.returning({ id: journalEntriesHeaders.id });
	// if (id) filters.push(eq(journalEntries.id, id));
	// if (source) filters.push(eq(journalEntries.source, source));
	// if (sourceId) filters.push(eq(journalEntries.sourceId, sourceId));

	// if (filters.length === 0) {
	// 	throw new Error("No criteria provided for deleting journal entry");
	// }

	// await connection
	// 	.delete(journalEntries)
	// 	.where(and(...filters))
	// 	.returning({ id: journalEntries.id });
};

export const areJournalValuesBalanced = (
	lines: Omit<
		typeof journalEntries.$inferInsert,
		| "id"
		| "deletedAt"
		| "source"
		| "sourceId"
		| "congregationId"
		| "transactionDate"
	>[],
) => {
	let debitTotal = 0;
	let creditTotal = 0;

	for (const line of lines) {
		const amount = parseFloat(line.amount ?? "0");
		if (line.dc === "debit") {
			debitTotal += amount;
		} else if (line.dc === "credit") {
			creditTotal += amount;
		}
	}

	return debitTotal === creditTotal;
};

type CashEquivalentAccountIdParams = {
	paymentMethod: schema.PaymentMethod;
	congregationId: number;
	bankId?: number;
};

export const getCashEquivalentAccountId = async ({
	paymentMethod,
	congregationId,
	bankId,
}: CashEquivalentAccountIdParams) => {
	let creditingAccountId: number;

	if (
		paymentMethod === "bank" ||
		paymentMethod === "cheque" ||
		paymentMethod === "mpesa"
	) {
		if (!bankId) {
			throw new Error("Bank is required for this payment method");
		}

		const result = await db
			.select({ accountId: ledgerAccounts.id })
			.from(ledgerAccounts)
			.where(
				and(
					eq(ledgerAccounts.id, bankId),
					eq(ledgerAccounts.congregationId, congregationId),
					eq(ledgerAccounts.active, true),
					isNull(ledgerAccounts.deletedAt),
				),
			);

		if (result.length === 0) {
			throw new Error(`Bank account not found`);
		}

		const [{ accountId }] = result;
		creditingAccountId = accountId;
	} else {
		const result = await db.query.ledgerAccounts.findFirst({
			columns: { id: true },
			where: and(
				eq(ledgerAccounts.name, "cash at hand"),
				isNull(ledgerAccounts.congregationId),
			),
		});

		if (!result) {
			throw new Error(`Account 'cash at hand' not found`);
		}

		creditingAccountId = result.id;
	}

	return creditingAccountId;
};

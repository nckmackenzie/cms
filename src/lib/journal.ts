import type { ExtractTablesWithRelations } from "drizzle-orm";
import { and, eq, sql } from "drizzle-orm";
import type { NodePgQueryResultHKT } from "drizzle-orm/node-postgres";
import type { PgTransaction } from "drizzle-orm/pg-core";
import type { Source } from "#/lib/constants";
import { db } from "@/db";
import type * as schema from "@/db/schema";
import { journalEntries, ledgerAccounts } from "@/db/schema";
import {
	type AccountType,
	defaultNormalBalanceForType,
} from "@/features/coa/services/coa.api";

type Transaction = PgTransaction<
	NodePgQueryResultHKT,
	typeof schema,
	ExtractTablesWithRelations<typeof schema>
>;

type CreateJournalEntryParams = {
	lines: Omit<
		typeof journalEntries.$inferInsert,
		"id" | "deletedAt" | "source" | "sourceId"
	>[];
	source: { source: Source; sourceId: string };
	tx?: Transaction;
};

export const createJournalEntry = async ({
	lines,
	source: { source, sourceId },
	tx,
}: CreateJournalEntryParams) => {
	const connection = tx ?? db;

	if (lines.length > 0) {
		await connection.insert(journalEntries).values(
			lines.map((line) => ({
				...line,
				source,
				sourceId,
			})),
		);
	}

	return { source, sourceId };
};

type DeleteJournalEntryParams = {
	id?: number;
	source?: string;
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
	if (id) filters.push(eq(journalEntries.id, id));
	if (source) filters.push(eq(journalEntries.source, source));
	if (sourceId) filters.push(eq(journalEntries.sourceId, sourceId));

	if (filters.length === 0) {
		throw new Error("No criteria provided for deleting journal entry");
	}

	await connection
		.delete(journalEntries)
		.where(and(...filters))
		.returning({ id: journalEntries.id });
};

export const createOrGetAccountId = async (
	accountName: string,
	type: AccountType,
	congregationId?: number,
	tx?: Transaction,
) => {
	const connection = tx ?? db;
	const account = await connection.query.ledgerAccounts.findFirst({
		where: eq(sql`lower(${ledgerAccounts.name})`, accountName.toLowerCase()),
	});

	if (!account) {
		const [newAccount] = await connection
			.insert(ledgerAccounts)
			.values({
				name: accountName,
				congregationId: congregationId ?? null,
				accountType: type,
				normalBalance: defaultNormalBalanceForType(type),
				isPosting: true,
				active: true,
			})
			.returning();
		return newAccount.id;
	}

	return account.id;
};

export const areJournalValuesBalanced = (
	lines: Omit<typeof journalEntries.$inferInsert, "id" | "deletedAt">[],
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
	bankId?: number;
};

export const getCashEquivalentAccountId = async ({
	paymentMethod,
	bankId,
}: CashEquivalentAccountIdParams) => {
	let creditingAccountId: number;

	if (paymentMethod === "bank" || paymentMethod === "cheque") {
		if (!bankId) {
			throw new Error("Bank is required for this payment method");
		}

		const result = await db
			.select({ accountId: ledgerAccounts.id })
			.from(ledgerAccounts)
			.where(eq(ledgerAccounts.id, bankId));

		if (result.length === 0) {
			throw new Error(`Bank account not found`);
		}

		const [{ accountId }] = result;
		creditingAccountId = accountId;
	} else {
		const result = await db.query.ledgerAccounts.findFirst({
			columns: { id: true },
			where: eq(ledgerAccounts.name, "cash at hand"),
		});

		if (!result) {
			throw new Error(`Account 'cash at hand' not found`);
		}

		creditingAccountId = result.id;
	}

	return creditingAccountId;
};

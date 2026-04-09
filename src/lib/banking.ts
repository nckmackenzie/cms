import { and, type ExtractTablesWithRelations, eq } from "drizzle-orm";
import type { NodePgQueryResultHKT } from "drizzle-orm/node-postgres";
import type { PgTransaction } from "drizzle-orm/pg-core";
import { db } from "@/db";
import type * as schema from "@/db/schema";
import { bankPostings } from "@/db/schema";
import type { Source } from "./constants";

type Transaction = PgTransaction<
	NodePgQueryResultHKT,
	typeof schema,
	ExtractTablesWithRelations<typeof schema>
>;

type CreateBankingEntryParams = {
	entry: Omit<
		typeof bankPostings.$inferInsert,
		"id" | "createdAt" | "deletedAt"
	>;
	tx?: Transaction;
};

export const createBankingEntry = async ({
	entry,
	tx,
}: CreateBankingEntryParams) => {
	const connection = tx ?? db;

	const [{ id: journalId }] = await connection
		.insert(bankPostings)
		.values(entry)
		.returning({ id: bankPostings.id });

	return journalId;
};

type DeleteBankingEntryParams = {
	source: Source;
	sourceId: string;
	congregationId: number;
	tx?: Transaction;
};

export const deleteBankingEntry = async ({
	source,
	sourceId,
	congregationId,
	tx,
}: DeleteBankingEntryParams) => {
	const connection = tx ?? db;

	await connection
		.delete(bankPostings)
		.where(
			and(
				eq(bankPostings.source, source),
				eq(bankPostings.sourceId, sourceId),
				eq(bankPostings.congregationId, congregationId),
			),
		)
		.returning({ id: bankPostings.id });
};

import type { SQL } from "drizzle-orm";
import type { PgColumn, PgTable } from "drizzle-orm/pg-core";
import { db } from "#/db";

export async function resolveIdByPublicId(
	table: PgTable & { id: PgColumn },
	where: SQL | undefined,
	entityName: string,
): Promise<number> {
	const [result] = await db
		.select({ id: table.id })
		// biome-ignore lint/suspicious/noExplicitAny: drizzle's `.from()` generics can't be satisfied for a table typed only by its shared `id` column
		.from(table as any)
		.where(where)
		.limit(1);

	if (!result) {
		throw new Error(`${entityName} not found`);
	}

	return result.id as number;
}

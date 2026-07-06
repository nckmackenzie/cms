import { createServerFn } from "@tanstack/react-start";
import { and, eq, gte, isNull, lte } from "drizzle-orm";
import { db } from "#/db";
import { fiscalYears } from "#/db/schema";
import { dateFormat } from "#/lib/helpers";
import { stringSchema } from "#/lib/schemas";
import { authMiddleware } from "#/middleware/auth";

export const getFinancialYearByDate = createServerFn()
	.middleware([authMiddleware])
	.validator((date?: string) => date)
	.handler(async ({ data: date }) => {
		const fiscalYear = await db.query.fiscalYears.findFirst({
			where: and(
				isNull(fiscalYears.deletedAt),
				lte(fiscalYears.startDate, dateFormat(date || new Date())),
				gte(fiscalYears.endDate, dateFormat(date || new Date())),
			),
		});

		if (!fiscalYear) {
			throw new Error("Year not found");
		}

		return fiscalYear;
	});

export const getFinancialYears = createServerFn()
	.middleware([authMiddleware])
	.handler(async () => {
		return db.query.fiscalYears.findMany({
			columns: { publicId: true, yearName: true },
			where: isNull(fiscalYears.deletedAt),
			orderBy: (fiscalYears, { desc }) => [desc(fiscalYears.id)],
		});
	});

export const getFinancialYearById = createServerFn()
	.middleware([authMiddleware])
	.validator(stringSchema("Year is required"))
	.handler(async ({ data: id }) => {
		const fiscalYear = await db.query.fiscalYears.findFirst({
			where: and(isNull(fiscalYears.deletedAt), eq(fiscalYears.publicId, id)),
		});

		if (!fiscalYear) {
			throw new Error("Year not found");
		}

		return fiscalYear;
	});

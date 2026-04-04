import { and, gte, isNull, lte } from "drizzle-orm";
import { db } from "#/db";
import { fiscalYears } from "#/db/schema";
import { dateFormat } from "#/lib/helpers";

export const getFinancialYearByDate = async (date?: string) => {
	const fiscalYear = await db.query.fiscalYears.findFirst({
		where: and(
			isNull(fiscalYears.deletedAt),
			lte(fiscalYears.startDate, dateFormat(date || new Date())),
			gte(fiscalYears.endDate, dateFormat(date || new Date())),
		),
	});

	return fiscalYear;
};

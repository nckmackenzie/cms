import { createServerFn } from "@tanstack/react-start";
import { and, eq, gte, isNull, lte, sql } from "drizzle-orm";
import { db } from "#/db";
import {
	bankPostings,
	expensesDetail,
	expensesHeader,
	fundRequisitions,
	receiptDetails,
	receiptHeader,
} from "#/db/schema";
import { dateFormat } from "#/lib/helpers";
import { authMiddleware } from "#/middleware/auth";
import { financeDashboardValidateSearch } from "../lib/schemas";

type DateRangeWithCongregation = {
	startDate: string;
	endDate: string;
	congregationId: number;
};

async function getReceiptsTotal({
	startDate,
	endDate,
	congregationId,
}: DateRangeWithCongregation) {
	const [{ totalAmount }] = await db
		.select({
			totalAmount: sql`COALESCE(SUM(${receiptDetails.amount}), 0)`.mapWith(
				Number,
			),
		})
		.from(receiptDetails)
		.innerJoin(receiptHeader, eq(receiptDetails.headerId, receiptHeader.id))
		.where(
			and(
				isNull(receiptHeader.deletedAt),
				eq(receiptHeader.congregationId, congregationId),
				gte(receiptHeader.contributionDate, startDate),
				lte(receiptHeader.contributionDate, endDate),
			),
		);
	return totalAmount;
}

async function getExpenseSummary({
	startDate,
	endDate,
	congregationId,
}: DateRangeWithCongregation) {
	const [{ totalApprovedExpenses }] = await db
		.select({
			totalApprovedExpenses:
				sql`COALESCE(SUM(${expensesDetail.amount}), 0)`.mapWith(Number),
		})
		.from(expensesDetail)
		.innerJoin(expensesHeader, eq(expensesDetail.expenseId, expensesHeader.id))
		.where(
			and(
				isNull(expensesHeader.deletedAt),
				eq(expensesHeader.congregationId, congregationId),
				gte(expensesHeader.expenseDate, startDate),
				lte(expensesHeader.expenseDate, endDate),
				eq(expensesHeader.status, "approved"),
			),
		);

	const unApprovedExpenses = await db.$count(
		expensesHeader,
		and(
			eq(expensesHeader.status, "pending"),
			isNull(expensesHeader.deletedAt),
			eq(expensesHeader.congregationId, congregationId),
			gte(expensesHeader.expenseDate, startDate),
			lte(expensesHeader.expenseDate, endDate),
		),
	);
	return { totalApprovedExpenses, unApprovedExpenses };
}

async function getFundRequisitionSummary({
	startDate,
	endDate,
	congregationId,
}: DateRangeWithCongregation) {
	const [[{ totalFundRequisitionsApproved }], unApprovedFundRequisitions] =
		await Promise.all([
			db
				.select({
					totalFundRequisitionsApproved:
						sql<number>`COALESCE(SUM(${fundRequisitions.amountApproved}), 0)`.mapWith(
							Number,
						),
				})
				.from(fundRequisitions)
				.where(
					and(
						isNull(fundRequisitions.deletedAt),
						eq(fundRequisitions.status, "approved"),
						gte(fundRequisitions.approvedDate, startDate),
						lte(fundRequisitions.approvedDate, endDate),
						eq(fundRequisitions.congregationId, congregationId),
					),
				),
			db.$count(
				fundRequisitions,
				and(
					isNull(fundRequisitions.deletedAt),
					eq(fundRequisitions.status, "pending"),
					gte(fundRequisitions.requisitionDate, startDate),
					lte(fundRequisitions.requisitionDate, endDate),
					eq(fundRequisitions.congregationId, congregationId),
				),
			),
		]);
	return { totalFundRequisitionsApproved, unApprovedFundRequisitions };
}

async function getUnclearedTransactions({
	startDate,
	endDate,
	congregationId,
}: DateRangeWithCongregation) {
	const [unclearedTransactionsCount, [{ totalUnclearedTransactions }]] =
		await Promise.all([
			db.$count(
				bankPostings,
				and(
					isNull(bankPostings.deletedAt),
					eq(bankPostings.congregationId, congregationId),
					eq(bankPostings.cleared, false),
					gte(bankPostings.transactionDate, startDate),
					lte(bankPostings.transactionDate, endDate),
				),
			),
			db
				.select({
					totalUnclearedTransactions:
						sql<number>`COALESCE(SUM(${bankPostings.amount}), 0)`.mapWith(
							Number,
						),
				})
				.from(bankPostings)
				.where(
					and(
						isNull(bankPostings.deletedAt),
						eq(bankPostings.congregationId, congregationId),
						eq(bankPostings.cleared, false),
						gte(bankPostings.transactionDate, startDate),
						lte(bankPostings.transactionDate, endDate),
					),
				),
		]);
	return { unclearedTransactionsCount, totalUnclearedTransactions };
}

export const getDashboardStats = createServerFn()
	.middleware([authMiddleware])
	.validator(financeDashboardValidateSearch)
	.handler(
		async ({
			data,
			context: {
				user: { congregationId },
			},
		}) => {
			try {
				const financialYear = await db.query.fiscalYears.findFirst({
					columns: { startDate: true, endDate: true },
					where: (fi, { eq, isNull, and, gte, lte }) => {
						if (data.financialYear) {
							return and(
								eq(fi.publicId, data.financialYear),
								isNull(fi.deletedAt),
							);
						}
						const now = dateFormat(new Date());
						return and(
							isNull(fi.deletedAt),
							lte(fi.startDate, now),
							gte(fi.endDate, now),
						);
					},
				});

				if (!financialYear) {
					throw new Error("No financial year found");
				}

				const { startDate, endDate } = financialYear;

				const [
					receiptsTotal,
					expenseSummary,
					fundRequisitionSummary,
					unclearedTransactions,
				] = await Promise.all([
					getReceiptsTotal({ startDate, endDate, congregationId }),
					getExpenseSummary({ startDate, endDate, congregationId }),
					getFundRequisitionSummary({ startDate, endDate, congregationId }),
					getUnclearedTransactions({ startDate, endDate, congregationId }),
				]);

				return {
					receiptsTotal,
					expenseSummary,
					fundRequisitionSummary,
					unclearedTransactions,
				};
			} catch (error) {
				console.error("Error fetching finance dashboard stats", error);
				throw new Error("Unable to fetch finance stats");
			}
		},
	);

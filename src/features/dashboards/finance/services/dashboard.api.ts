import { createServerFn } from "@tanstack/react-start";
import { and, desc, eq, gte, inArray, isNull, lte, sql } from "drizzle-orm";
import { db } from "#/db";
import {
	bankPostings,
	budgetsHeader,
	budgetsLine,
	churchRequisitionCategories,
	districts,
	expensesDetail,
	expensesHeader,
	fundRequisitions,
	groups,
	ledgerAccounts,
	receiptDetails,
	receiptHeader,
} from "#/db/schema";
import { dateFormat, percentage } from "#/lib/helpers";
import { toTitleCase } from "#/lib/utils";
import { authMiddleware } from "#/middleware/auth";
import { getAccountabilityVariance, isFullyAccounted } from "../lib/helpers";
import { financeDashboardValidateSearch } from "../lib/schemas";

type DateRangeWithCongregation = {
	startDate: string;
	endDate: string;
	congregationId: number;
};

async function resolveFinancialYearRange(financialYear?: string | null) {
	const fiscalYear = await db.query.fiscalYears.findFirst({
		columns: { id: true, startDate: true, endDate: true },
		where: (fi, { eq, isNull, and, gte, lte }) => {
			if (financialYear) {
				return and(eq(fi.publicId, financialYear), isNull(fi.deletedAt));
			}
			const now = dateFormat(new Date());
			return and(
				isNull(fi.deletedAt),
				lte(fi.startDate, now),
				gte(fi.endDate, now),
			);
		},
	});

	if (!fiscalYear) {
		throw new Error("No financial year found");
	}

	return fiscalYear;
}

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
				const { startDate, endDate } = await resolveFinancialYearRange(
					data.financialYear,
				);

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

async function getReceiptsByDistrictData({
	startDate,
	endDate,
	congregationId,
}: DateRangeWithCongregation) {
	return db
		.select({
			districtId: districts.publicId,
			districtName: districts.districtName,
			amount: sql<number>`COALESCE(SUM(${receiptDetails.amount}), 0)`.mapWith(
				Number,
			),
		})
		.from(receiptDetails)
		.innerJoin(receiptHeader, eq(receiptDetails.headerId, receiptHeader.id))
		.innerJoin(
			districts,
			eq(receiptDetails.contributorDistrictId, districts.id),
		)
		.where(
			and(
				isNull(receiptHeader.deletedAt),
				eq(receiptHeader.congregationId, congregationId),
				eq(receiptDetails.category, "district"),
				gte(receiptHeader.contributionDate, startDate),
				lte(receiptHeader.contributionDate, endDate),
			),
		)
		.groupBy(districts.publicId, districts.districtName)
		.orderBy(desc(sql`SUM(${receiptDetails.amount})`));
}

export const getReceiptsByDistrict = createServerFn()
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
				const { startDate, endDate } = await resolveFinancialYearRange(
					data.financialYear,
				);
				return await getReceiptsByDistrictData({
					startDate,
					endDate,
					congregationId,
				});
			} catch (error) {
				console.error("Error fetching receipts by district", error);
				throw new Error("Unable to fetch receipts by district");
			}
		},
	);

async function getLatestFundRequisitionsData({
	startDate,
	endDate,
	congregationId,
}: DateRangeWithCongregation) {
	return db
		.select({
			id: fundRequisitions.publicId,
			requisitionNo: fundRequisitions.requisitionNo,
			purpose: fundRequisitions.purpose,
			status: fundRequisitions.status,
			requisitionType: fundRequisitions.requestType,
			amount:
				sql<number>`COALESCE(${fundRequisitions.amountApproved}, ${fundRequisitions.amountRequested})`.mapWith(
					Number,
				),
			requisitionDate: fundRequisitions.requisitionDate,
			approvedDate: fundRequisitions.approvedDate,
			requestedBy: sql<string>`CASE
				WHEN ${fundRequisitions.districtId} IS NOT NULL THEN ${districts.districtName}
				WHEN ${fundRequisitions.groupId} IS NOT NULL THEN ${groups.groupName}
				WHEN ${fundRequisitions.churchCategoryId} IS NOT NULL THEN ${churchRequisitionCategories.name}
			END`.as("requestedBy"),
		})
		.from(fundRequisitions)
		.leftJoin(districts, eq(fundRequisitions.districtId, districts.id))
		.leftJoin(groups, eq(fundRequisitions.groupId, groups.id))
		.leftJoin(
			churchRequisitionCategories,
			eq(fundRequisitions.churchCategoryId, churchRequisitionCategories.id),
		)
		.where(
			and(
				isNull(fundRequisitions.deletedAt),
				eq(fundRequisitions.congregationId, congregationId),
				inArray(fundRequisitions.status, ["pending", "approved"]),
				gte(fundRequisitions.requisitionDate, startDate),
				lte(fundRequisitions.requisitionDate, endDate),
			),
		)
		.orderBy(
			sql`CASE WHEN ${fundRequisitions.status} = 'pending' THEN 0 ELSE 1 END`,
			desc(
				sql`COALESCE(${fundRequisitions.approvedDate}, ${fundRequisitions.requisitionDate})`,
			),
		)
		.limit(5);
}

export const getLatestFundRequisitions = createServerFn()
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
				const { startDate, endDate } = await resolveFinancialYearRange(
					data.financialYear,
				);
				return await getLatestFundRequisitionsData({
					startDate,
					endDate,
					congregationId,
				});
			} catch (error) {
				console.error("Error fetching latest fund requisitions", error);
				throw new Error("Unable to fetch latest fund requisitions");
			}
		},
	);

async function getBudgetVsActualData({
	startDate,
	endDate,
	congregationId,
	financialYearId,
}: DateRangeWithCongregation & { financialYearId: number }) {
	const [budgetLines, actuals] = await Promise.all([
		db
			.select({
				accountId: ledgerAccounts.id,
				publicId: ledgerAccounts.publicId,
				name: ledgerAccounts.name,
				budgetAmount: sql<number>`SUM(${budgetsLine.amount})`.mapWith(Number),
			})
			.from(budgetsHeader)
			.innerJoin(budgetsLine, eq(budgetsHeader.id, budgetsLine.budgetHeaderId))
			.innerJoin(ledgerAccounts, eq(budgetsLine.accountId, ledgerAccounts.id))
			.where(
				and(
					eq(budgetsHeader.type, "church"),
					eq(budgetsHeader.financialYearId, financialYearId),
					eq(budgetsHeader.congregationId, congregationId),
					isNull(budgetsHeader.deletedAt),
				),
			)
			.groupBy(ledgerAccounts.id, ledgerAccounts.publicId, ledgerAccounts.name),
		db
			.select({
				accountId: expensesDetail.accountId,
				actualAmount: sql<number>`SUM(${expensesDetail.amount})`.mapWith(
					Number,
				),
			})
			.from(expensesDetail)
			.innerJoin(
				expensesHeader,
				eq(expensesDetail.expenseId, expensesHeader.id),
			)
			.where(
				and(
					isNull(expensesHeader.deletedAt),
					eq(expensesHeader.congregationId, congregationId),
					eq(expensesHeader.expenseType, "church"),
					eq(expensesHeader.status, "approved"),
					gte(expensesHeader.expenseDate, startDate),
					lte(expensesHeader.expenseDate, endDate),
				),
			)
			.groupBy(expensesDetail.accountId),
	]);

	const actualsByAccountId = new Map(
		actuals.map(({ accountId, actualAmount }) => [accountId, actualAmount]),
	);

	return budgetLines
		.filter((line) => line.budgetAmount > 0)
		.map((line) => {
			const actualAmount = actualsByAccountId.get(line.accountId) ?? 0;
			return {
				id: line.publicId,
				name: toTitleCase(line.name),
				budgetAmount: line.budgetAmount,
				actualAmount,
				percentageSpent: percentage(actualAmount, line.budgetAmount),
			};
		})
		.sort((a, b) => b.percentageSpent - a.percentageSpent)
		.slice(0, 5);
}

export const getBudgetVsActual = createServerFn()
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
				const { id, startDate, endDate } = await resolveFinancialYearRange(
					data.financialYear,
				);
				return await getBudgetVsActualData({
					startDate,
					endDate,
					congregationId,
					financialYearId: id,
				});
			} catch (error) {
				console.error("Error fetching budget vs actual", error);
				throw new Error("Unable to fetch budget vs actual");
			}
		},
	);

async function getExpenseAccountabilityData({
	startDate,
	endDate,
	congregationId,
}: DateRangeWithCongregation) {
	const [requisitions, accounted] = await Promise.all([
		db
			.select({
				id: fundRequisitions.id,
				publicId: fundRequisitions.publicId,
				requisitionNo: fundRequisitions.requisitionNo,
				purpose: fundRequisitions.purpose,
				requisitionType: fundRequisitions.requestType,
				approvedAmount:
					sql<number>`COALESCE(${fundRequisitions.amountApproved}, 0)`.mapWith(
						Number,
					),
				requestedBy: sql<string>`CASE
					WHEN ${fundRequisitions.districtId} IS NOT NULL THEN ${districts.districtName}
					WHEN ${fundRequisitions.groupId} IS NOT NULL THEN ${groups.groupName}
				END`.as("requestedBy"),
			})
			.from(fundRequisitions)
			.leftJoin(districts, eq(fundRequisitions.districtId, districts.id))
			.leftJoin(groups, eq(fundRequisitions.groupId, groups.id))
			.where(
				and(
					isNull(fundRequisitions.deletedAt),
					eq(fundRequisitions.congregationId, congregationId),
					eq(fundRequisitions.status, "approved"),
					inArray(fundRequisitions.requestType, ["group", "district"]),
					gte(fundRequisitions.approvedDate, startDate),
					lte(fundRequisitions.approvedDate, endDate),
				),
			),
		db
			.select({
				requisitionId: expensesHeader.requisitionId,
				accountedAmount: sql<number>`SUM(${expensesDetail.amount})`.mapWith(
					Number,
				),
			})
			.from(expensesDetail)
			.innerJoin(
				expensesHeader,
				eq(expensesDetail.expenseId, expensesHeader.id),
			)
			.where(
				and(
					isNull(expensesHeader.deletedAt),
					eq(expensesHeader.congregationId, congregationId),
					eq(expensesHeader.status, "approved"),
				),
			)
			.groupBy(expensesHeader.requisitionId),
	]);

	const accountedByRequisitionId = new Map(
		accounted.map(({ requisitionId, accountedAmount }) => [
			requisitionId,
			accountedAmount,
		]),
	);

	return requisitions
		.map((requisition) => {
			const accountedAmount = accountedByRequisitionId.get(requisition.id) ?? 0;
			return {
				id: requisition.publicId,
				requisitionNo: requisition.requisitionNo,
				purpose: requisition.purpose,
				requisitionType: requisition.requisitionType,
				requestedBy: requisition.requestedBy,
				approvedAmount: requisition.approvedAmount,
				accountedAmount,
				variance: getAccountabilityVariance(
					requisition.approvedAmount,
					accountedAmount,
				),
			};
		})
		.filter(
			(item) => !isFullyAccounted(item.approvedAmount, item.accountedAmount),
		)
		.sort((a, b) => Math.abs(b.variance) - Math.abs(a.variance))
		.slice(0, 5);
}

export const getExpenseAccountability = createServerFn()
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
				const { startDate, endDate } = await resolveFinancialYearRange(
					data.financialYear,
				);
				return await getExpenseAccountabilityData({
					startDate,
					endDate,
					congregationId,
				});
			} catch (error) {
				console.error("Error fetching expense accountability", error);
				throw new Error("Unable to fetch expense accountability");
			}
		},
	);

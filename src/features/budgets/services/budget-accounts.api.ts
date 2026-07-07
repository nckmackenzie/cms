import { notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { and, asc, eq, ilike, isNull, notInArray, or, sql } from "drizzle-orm";
import { union } from "drizzle-orm/pg-core";
import { z } from "zod";
import { db } from "#/db";
import {
	budgetsHeader,
	budgetsLine,
	fiscalYears,
	groups,
	ledgerAccounts,
} from "#/db/schema";
import {
	type BudgetFormSchema,
	budgetFormSchema,
} from "#/features/budgets/utils/schemas";
import { getAccountByPublicId } from "#/features/coa/services/coa.api";
import { getFinancialYearById } from "#/features/fiscal-years/services/years.api";
import { getGroupIdFn } from "#/features/groups/services/groups.api";
import { failure, success } from "#/lib/result";
import { queryValidateSearch, stringSchema } from "#/lib/schemas";
import { toTitleCase } from "#/lib/utils";
import { authMiddleware } from "#/middleware/auth";

const budgetExpenseAccountsInput = z.object({
	type: z.enum(["church", "group"]),
});

export type BudgetType = z.infer<typeof budgetExpenseAccountsInput>["type"];

const getBudget = async ({
	congregationId,
	budgetId,
}: {
	congregationId: number;
	budgetId: string;
}) => {
	return db.query.budgetsHeader.findFirst({
		where: and(
			eq(budgetsHeader.publicId, budgetId),
			eq(budgetsHeader.congregationId, congregationId),
			isNull(budgetsHeader.deletedAt),
		),
	});
};

const createBudget = async ({
	values,
	congregationId,
}: {
	values: BudgetFormSchema;
	congregationId: number;
}) => {
	const [year, group] = await Promise.all([
		getFinancialYearById({ data: values.financialYearId }),
		values.type === "group" && values.groupId
			? getGroupIdFn({ data: { publicId: values.groupId } })
			: Promise.resolve(null),
	]);

	const budget = await db.query.budgetsHeader.findFirst({
		columns: { id: true },
		where: and(
			eq(budgetsHeader.type, values.type),
			eq(budgetsHeader.financialYearId, year.id),
			eq(budgetsHeader.congregationId, congregationId),
			values.type === "group" && group
				? eq(budgetsHeader.groupId, group)
				: isNull(budgetsHeader.groupId),
		),
	});

	if (budget) {
		return failure({
			type: "ValidationError",
			message: `A ${values.type} budget already exists for ${year.yearName}`,
		});
	}

	const sumOfBudget = values.accounts.reduce(
		(acc, account) => acc + Number(account.amount || 0),
		0,
	);

	if (sumOfBudget === 0) {
		return failure({
			type: "ValidationError",
			message: "Budget amount cannot be zero",
		});
	}

	try {
		await db.transaction(async (tx) => {
			const [{ id: budgetId }] = await tx
				.insert(budgetsHeader)
				.values({
					type: values.type,
					financialYearId: year.id,
					congregationId,
					groupId: values.type === "group" && group ? group : undefined,
				})
				.returning({ id: budgetsHeader.id });

			const entries = await Promise.all(
				values.accounts
					.filter((account) => account.amount !== 0)
					.map(async (account) => {
						return {
							accountId: await getAccountByPublicId({ data: account.id }),
							budgetHeaderId: budgetId,
							amount: account.amount.toString(),
						};
					}),
			);

			await tx.insert(budgetsLine).values(entries);
		});

		return success(undefined);
	} catch (error) {
		console.error(error);
		return failure({
			type: "ApplicationError",
			message: "Failed to create budget",
		});
	}
};

const updateBudget = async ({
	values,
	congregationId,
	budgetId,
}: {
	values: BudgetFormSchema;
	congregationId: number;
	budgetId: string;
}) => {
	const budget = await getBudget({ budgetId, congregationId });

	if (!budget) {
		return failure({
			type: "ValidationError",
			message: "Budget not found",
		});
	}

	const sumOfBudget = values.accounts.reduce(
		(acc, account) => acc + Number(account.amount || 0),
		0,
	);

	if (sumOfBudget === 0) {
		return failure({
			type: "ValidationError",
			message: "Budget amount cannot be zero",
		});
	}

	try {
		await db.transaction(async (tx) => {
			await tx
				.delete(budgetsLine)
				.where(eq(budgetsLine.budgetHeaderId, budget.id));

			const entries = await Promise.all(
				values.accounts
					.filter((account) => account.amount !== 0)
					.map(async (account) => {
						return {
							accountId: await getAccountByPublicId({ data: account.id }),
							budgetHeaderId: budget.id,
							amount: account.amount.toString(),
						};
					}),
			);

			await tx.insert(budgetsLine).values(entries);
		});

		return success(undefined);
	} catch (error) {
		console.error(error);
		return failure({
			type: "ApplicationError",
			message: "Failed to update budget",
		});
	}
};

export const getBudgetExpenseAccounts = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.validator(budgetExpenseAccountsInput)
	.handler(
		async ({
			data: { type },
			context: {
				user: { congregationId },
			},
		}) => {
			const shouldBeForGroup = type === "group";

			return db
				.select({
					id: ledgerAccounts.id,
					publicId: ledgerAccounts.publicId,
					name: ledgerAccounts.name,
					parentId: ledgerAccounts.parentId,
					isPosting: ledgerAccounts.isPosting,
				})
				.from(ledgerAccounts)
				.where(
					and(
						eq(ledgerAccounts.accountType, "expense"),
						eq(ledgerAccounts.isPosting, true),
						eq(ledgerAccounts.active, true),
						eq(ledgerAccounts.forGroup, shouldBeForGroup),
						isNull(ledgerAccounts.deletedAt),
						or(
							eq(ledgerAccounts.congregationId, congregationId),
							isNull(ledgerAccounts.congregationId),
						),
					),
				)
				.orderBy(asc(ledgerAccounts.name))
				.then((data) =>
					data.map((d) => ({
						...d,
						name: toTitleCase(d.name),
					})),
				);
		},
	);

export const getBudgets = createServerFn()
	.middleware([authMiddleware])
	.validator(queryValidateSearch)
	.handler(async ({ data, context }) => {
		return db
			.select({
				publicId: budgetsHeader.publicId,
				type: budgetsHeader.type,
				year: fiscalYears.yearName,
				groupName: groups.groupName,
				amount: sql<number>`SUM(${budgetsLine.amount})`,
			})
			.from(budgetsHeader)
			.innerJoin(budgetsLine, eq(budgetsHeader.id, budgetsLine.budgetHeaderId))
			.innerJoin(fiscalYears, eq(budgetsHeader.financialYearId, fiscalYears.id))
			.leftJoin(groups, eq(budgetsHeader.groupId, groups.id))
			.where(
				and(
					eq(budgetsHeader.congregationId, context.user.congregationId),
					isNull(budgetsHeader.deletedAt),
					data.search
						? or(
								ilike(fiscalYears.yearName, `%${data.search}%`),
								ilike(groups.groupName, `%${data.search}%`),
								ilike(
									sql`CAST(${budgetsHeader.type} AS TEXT)`,
									`%${data.search}%`,
								),
							)
						: undefined,
				),
			)
			.groupBy(
				budgetsHeader.id,
				fiscalYears.yearName,
				groups.groupName,
				budgetsHeader.type,
			);
	});

export const getBudgetById = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.validator(stringSchema("Budget is required"))
	.handler(async ({ data, context }) => {
		const budget = await db.query.budgetsHeader.findFirst({
			where: and(
				eq(budgetsHeader.publicId, data),
				eq(budgetsHeader.congregationId, context.user.congregationId),
				isNull(budgetsHeader.deletedAt),
			),
			with: {
				group: { columns: { publicId: true } },
				fiscalYear: { columns: { publicId: true } },
			},
		});

		if (!budget) {
			throw notFound();
		}

		const details = db
			.select({
				id: ledgerAccounts.id,
				accountId: ledgerAccounts.publicId,
				amount: budgetsLine.amount,
			})
			.from(budgetsLine)
			.innerJoin(ledgerAccounts, eq(budgetsLine.accountId, ledgerAccounts.id))
			.where(and(eq(budgetsLine.budgetHeaderId, budget.id)));

		const includedIds = (await details).map((d) => d.id);

		const accounts = await union(
			details,
			db
				.select({
					id: ledgerAccounts.id,
					accountId: ledgerAccounts.publicId,
					amount: sql<string>`'0'`,
				})
				.from(ledgerAccounts)
				.where(
					and(
						includedIds.length > 0
							? notInArray(ledgerAccounts.id, includedIds)
							: undefined,
						eq(ledgerAccounts.accountType, "expense"),
						eq(ledgerAccounts.isPosting, true),
						eq(ledgerAccounts.forGroup, budget.type === "group"),
						isNull(ledgerAccounts.deletedAt),
					),
				),
		);

		return {
			id: budget.publicId,
			groupId: budget.group?.publicId,
			financialYearId: budget.fiscalYear?.publicId ?? "",
			type: budget.type,
			accounts: accounts.map((a) => ({
				id: a.accountId,
				amount: Number(a.amount),
			})),
		} satisfies BudgetFormSchema;
	});

export const upsertBudget = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.validator(budgetFormSchema)
	.handler(async ({ context, data }) => {
		if (data.id) {
			return updateBudget({
				values: data,
				congregationId: context.user.congregationId,
				budgetId: data.id,
			});
		}

		return createBudget({
			values: data,
			congregationId: context.user.congregationId,
		});
	});

export const deleteBudget = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.validator(stringSchema("Budget is required"))
	.handler(async ({ data, context }) => {
		const budget = await getBudget({
			congregationId: context.user.congregationId,
			budgetId: data,
		});

		if (!budget) {
			return failure({
				type: "NotFoundError",
				message: "Budget not found",
			});
		}

		await db
			.update(budgetsHeader)
			.set({ deletedAt: new Date() })
			.where(eq(budgetsHeader.id, budget.id));

		return success(undefined);
	});

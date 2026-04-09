import { createServerFn } from "@tanstack/react-start";
import { and, asc, eq, ilike, isNull, or, sql } from "drizzle-orm";
import type { z } from "zod";
import { db } from "#/db";
import { ledgerAccounts } from "#/db/schema";
import {
	accountsFormSchema,
	coaValidateSearch,
} from "#/features/coa/utils/schemas";
import { failure, success } from "#/lib/result";
import { toTitleCase } from "#/lib/utils";
import { authMiddleware } from "#/middleware/auth";

export type AccountType = z.infer<typeof accountsFormSchema>["accountType"];

export function defaultNormalBalanceForType(
	type: AccountType,
): "debit" | "credit" {
	switch (type) {
		case "asset":
		case "expense":
			return "debit";
		case "liability":
		case "equity":
		case "income":
			return "credit";
	}
}

const createAccount = async (data: z.infer<typeof accountsFormSchema>) => {
	const accountId = await db.transaction(async (tx) => {
		const [{ id }] = await tx
			.insert(ledgerAccounts)
			.values({
				name: toTitleCase(data.name),
				accountType: data.accountType,
				normalBalance: defaultNormalBalanceForType(data.accountType),
				parentId: data.isSubcategory ? Number(data.parentId) : null,
				active: data.isActive,
				description: data.description,
				isPosting: data.isSubcategory,
				accountNo: data.isBankAccount ? data.accountNumber : null,
				isBank: data.isBankAccount,
			})
			.returning({ id: ledgerAccounts.id });

		// TODO: implement opening balance after ledger table setup
		// if (data.isBankAccount) {
		// 	if (data.openingBalance && data.openingBalance !== 0) {
		// 		const openingBalanceEquity = await createOrGetAccountId(
		// 			"opening balance equity",
		// 			"equity",
		// 			tx,
		// 		);

		// 		const description = data.description
		// 			? data.description
		// 			: `Opening balance for ${data.name}`;

		// 		await createJournalEntry({
		// 			entry: {
		// 				entryDate: data.openingBalanceDate
		// 					? dateFormat(data.openingBalanceDate)
		// 					: dateFormat(new Date()),
		// 				source: "opening balance",
		// 				sourceId: id.toString(),
		// 				reference: data.accountNumber,
		// 				description,
		// 			},
		// 			lines: [
		// 				{
		// 					lineNumber: 1,
		// 					accountId: id,
		// 					amount: data.openingBalance.toString(),
		// 					memo: description,
		// 					dc: +data.openingBalance > 0 ? "debit" : "credit",
		// 				},
		// 				{
		// 					lineNumber: 2,
		// 					accountId: openingBalanceEquity,
		// 					amount: data.openingBalance.toString(),
		// 					memo: description,
		// 					dc: +data.openingBalance > 0 ? "credit" : "debit",
		// 				},
		// 			],
		// 			tx,
		// 		});
		// 	}
		// }

		return id;
	});

	return success(accountId);
};

export const getAccounts = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.inputValidator(coaValidateSearch)
	.handler(async ({ data: { search } }) => {
		return db
			.select()
			.from(ledgerAccounts)
			.where(
				search
					? or(
							ilike(ledgerAccounts.name, `%${search}%`),
							ilike(ledgerAccounts.description, `%${search}%`),
							ilike(
								sql`cast(${ledgerAccounts.accountType} as text)`,
								`%${search}%`,
							),
						)
					: undefined,
			)
			.orderBy(asc(ledgerAccounts.accountType), asc(ledgerAccounts.name))
			.then((data) =>
				data.map((d) => ({ ...d, name: toTitleCase(d.name.toLowerCase()) })),
			);
	});

export const getBankAccounts = createServerFn()
	.middleware([authMiddleware])
	.handler(
		async ({
			context: {
				user: { congregationId },
			},
		}) => {
			return db.query.ledgerAccounts
				.findMany({
					columns: { id: true, name: true, accountNo: true },
					where: and(
						eq(ledgerAccounts.isBank, true),
						eq(ledgerAccounts.active, true),
						isNull(ledgerAccounts.deletedAt),
						eq(ledgerAccounts.congregationId, congregationId),
					),
				})
				.then((data) =>
					data.map((d) => ({
						value: d.id.toString(),
						label: d.accountNo
							? `${d.name.toUpperCase()} - ${d.accountNo}`
							: d.name.toUpperCase(),
					})),
				);
		},
	);

export const upsertAccount = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.inputValidator(accountsFormSchema)
	.handler(async ({ data }) => {
		if (data.id) {
			const accountId = Number(data.id);
			if (Number.isNaN(accountId)) {
				return failure({
					type: "ValidationError",
					message: "Invalid account id",
				});
			}

			const account = await db.query.ledgerAccounts.findFirst({
				columns: { id: true },
				where: eq(ledgerAccounts.id, accountId),
			});
			if (!account) {
				return failure({
					type: "NotFoundError",
					message: "Account not found",
				});
			}

			const parentId = data.isSubcategory ? Number(data.parentId) : null;
			if (parentId === accountId) {
				return failure({
					type: "ValidationError",
					message: "Account cannot be its own parent",
				});
			}

			await db
				.update(ledgerAccounts)
				.set({
					name: toTitleCase(data.name),
					accountType: data.accountType,
					normalBalance: defaultNormalBalanceForType(data.accountType),
					parentId,
					active: data.isActive,
					description: data.description,
					isPosting: data.isSubcategory,
					accountNo: data.isBankAccount ? data.accountNumber : null,
					isBank: data.isBankAccount,
				})
				.where(eq(ledgerAccounts.id, accountId));

			return success(accountId);
		}
		return await createAccount(data);
	});

export const deleteAccount = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.inputValidator((data: string) => data)
	.handler(async ({ data }) => {
		const accountId = Number(data);
		if (Number.isNaN(accountId)) {
			return failure({
				type: "ValidationError",
				message: "Invalid account id",
			});
		}

		const account = await db.query.ledgerAccounts.findFirst({
			columns: { id: true },
			where: eq(ledgerAccounts.id, accountId),
		});
		if (!account) {
			return failure({
				type: "NotFoundError",
				message: "Account not found",
			});
		}
		const hasChildren = await db.query.ledgerAccounts.findFirst({
			columns: { id: true },
			where: eq(ledgerAccounts.parentId, accountId),
		});
		if (hasChildren) {
			return failure({
				type: "ConflictError",
				message: "Account has sub-accounts and cannot be deleted",
			});
		}
		try {
			await db.delete(ledgerAccounts).where(eq(ledgerAccounts.id, accountId));
			return success(undefined);
		} catch (error) {
			console.log(error);
			return failure({
				type: "ApplicationError",
				message: "Error deleting account",
			});
		}
	});

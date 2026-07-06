import { createServerFn } from "@tanstack/react-start";
import { and, asc, eq, ilike, isNull, or, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "#/db";
import {
	ACCOUNT_TYPES,
	journalEntriesHeaders,
	journalEntryLines,
	ledgerAccounts,
} from "#/db/schema";
import {
	accountsFormSchema,
	coaValidateSearch,
} from "#/features/coa/utils/schemas";
import { SOURCES } from "#/lib/constants";
import { resolveIdByPublicId } from "#/lib/db-helpers";
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

const createAccount = async (
	data: z.infer<typeof accountsFormSchema>,
	congregationId: number,
) => {
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
				congregationId,
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
	.validator(coaValidateSearch)
	.handler(
		async ({
			data: { search },
			context: {
				user: { congregationId },
			},
		}) => {
			return db
				.select()
				.from(ledgerAccounts)
				.where(
					and(
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
						or(
							eq(ledgerAccounts.congregationId, congregationId),
							isNull(ledgerAccounts.congregationId),
						),
						isNull(ledgerAccounts.deletedAt),
					),
				)
				.orderBy(asc(ledgerAccounts.accountType), asc(ledgerAccounts.name))
				.then((data) =>
					data.map((d) => ({ ...d, name: toTitleCase(d.name.toLowerCase()) })),
				);
		},
	);

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
					columns: { publicId: true, name: true, accountNo: true },
					where: and(
						eq(ledgerAccounts.isBank, true),
						eq(ledgerAccounts.active, true),
						isNull(ledgerAccounts.deletedAt),
						eq(ledgerAccounts.congregationId, congregationId),
					),
				})
				.then((data) =>
					data.map((d) => ({
						value: d.publicId,
						label: d.accountNo
							? `${d.name.toUpperCase()} - ${d.accountNo}`
							: d.name.toUpperCase(),
					})),
				);
		},
	);

export const getPostingAccounts = createServerFn()
	.middleware([authMiddleware])
	.validator(z.object({ search: z.enum(ACCOUNT_TYPES).optional() }))
	.handler(
		async ({
			data: { search },
			context: {
				user: { congregationId },
			},
		}) => {
			return db.query.ledgerAccounts
				.findMany({
					columns: { publicId: true, name: true },
					where: and(
						eq(ledgerAccounts.isPosting, true),
						eq(ledgerAccounts.active, true),
						isNull(ledgerAccounts.deletedAt),
						or(
							eq(ledgerAccounts.congregationId, congregationId),
							isNull(ledgerAccounts.congregationId),
						),
						search ? eq(ledgerAccounts.accountType, search) : undefined,
					),
					orderBy: asc(ledgerAccounts.name),
				})
				.then((data) =>
					data.map((d) => ({
						value: d.publicId,
						label: d.name.toUpperCase(),
					})),
				);
		},
	);

export const upsertAccount = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.validator(accountsFormSchema)
	.handler(
		async ({
			data,
			context: {
				user: { congregationId },
			},
		}) => {
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
			return await createAccount(data, congregationId);
		},
	);

export const deleteAccount = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.validator((data: string) => data)
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

export const getAccountByPublicId = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.validator((data: string) => data)
	.handler(async ({ data }) => {
		return resolveIdByPublicId(
			ledgerAccounts,
			eq(ledgerAccounts.publicId, data),
			"Account",
		);
	});

export const getTransactionJournal = createServerFn()
	.middleware([authMiddleware])
	.validator(
		z.object({
			source: z.enum(SOURCES),
			sourceId: z.string(),
		}),
	)
	.handler(
		async ({
			data: { source, sourceId },
			context: {
				user: { congregationId },
			},
		}) => {
			const data = await db
				.select({
					id: journalEntryLines.id,
					date: journalEntriesHeaders.transactionDate,
					accountName: ledgerAccounts.name,
					accountType: ledgerAccounts.accountType,
					debit: sql<number>`CASE WHEN ${journalEntryLines.dc} = 'debit' THEN ${journalEntryLines.amount} ELSE 0 END`,
					credit: sql<number>`CASE WHEN ${journalEntryLines.dc} = 'credit' THEN ${journalEntryLines.amount} ELSE 0 END`,
					narration: journalEntryLines.memo,
				})
				.from(journalEntriesHeaders)
				.innerJoin(
					journalEntryLines,
					eq(journalEntriesHeaders.id, journalEntryLines.journalId),
				)
				.innerJoin(
					ledgerAccounts,
					eq(journalEntryLines.accountId, ledgerAccounts.id),
				)
				.where(
					and(
						eq(journalEntriesHeaders.source, source),
						eq(journalEntriesHeaders.sourceId, sourceId),
						eq(journalEntriesHeaders.congregationId, congregationId),
						isNull(journalEntriesHeaders.deletedAt),
					),
				)
				.orderBy(asc(journalEntryLines.lineNumber), asc(journalEntryLines.id));

			if (data.length === 0) {
				throw new Error("Transaction journal not found");
			}

			return {
				date: data[0].date,
				entries: data.map((d) => ({
					id: d.id,
					accountName: d.accountName,
					accountType: d.accountType,
					debit: d.debit,
					credit: d.credit,
					narration: d.narration ?? undefined,
				})),
			};
		},
	);

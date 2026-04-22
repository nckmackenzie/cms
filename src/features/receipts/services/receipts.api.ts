import { notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import {
	and,
	desc,
	eq,
	gte,
	ilike,
	isNull,
	lte,
	or,
	type SQL,
	sql,
} from "drizzle-orm";
import { db } from "#/db";
import { type DebitCredit, receiptDetails, receiptHeader } from "#/db/schema";
import { getFinancialYearByDate } from "#/features/fiscal-years/services/years.api";
import {
	type ReceiptsFormValues,
	receiptsFormSchema,
	receiptsValidateSearch,
} from "#/features/receipts/utils/schema";
import { createBankingEntry, deleteBankingEntry } from "#/lib/banking";
import {
	dateFormat,
	normalizeDateRange,
	normalizeText,
	toNumber,
} from "#/lib/helpers";
import {
	createJournalEntry,
	deleteJournalEntry,
	getCashEquivalentAccountId,
} from "#/lib/journal";
import { failure, success } from "#/lib/result";
import { authMiddleware } from "#/middleware/auth";

const buildReceiptJournalLines = async (
	data: ReceiptsFormValues,
	congregationId: number,
) => {
	const journalLines = data.details.map((detail, i) => ({
		accountId: toNumber(detail.accountId),
		amount: detail.amount.toString(),
		dc: "credit" as DebitCredit,
		lineNumber: i + 1,
		memo: normalizeText(detail.narration),
	}));

	const totalAmount = data.details.reduce(
		(acc, detail) => acc + parseFloat(detail.amount.toString()),
		0,
	);

	journalLines.push({
		accountId: await getCashEquivalentAccountId({
			paymentMethod: data.paymentMethod,
			congregationId,
			bankId: data.bankId ?? undefined,
		}),
		amount: totalAmount.toString(),
		dc: "debit" as DebitCredit,
		lineNumber: journalLines.length + 1,
		memo: normalizeText(data.reference),
	});

	return { journalLines, totalAmount };
};

const createReceipt = async (
	data: ReceiptsFormValues,
	congregationId: number,
	userId: number,
) => {
	const { journalLines, totalAmount } = await buildReceiptJournalLines(
		data,
		congregationId,
	);

	try {
		await db.transaction(async (tx) => {
			const receiptNo = await getReceiptNo(congregationId);
			const header = await tx
				.insert(receiptHeader)
				.values({
					receiptNo: receiptNo.toString(),
					contributionDate: data.contributionDate,
					postedBy: userId,
					congregationId,
				})
				.returning({ id: receiptHeader.id });

			await tx.insert(receiptDetails).values(
				data.details.map((detail) => ({
					headerId: header[0].id,
					category: detail.category,
					contributionAccountId: toNumber(detail.accountId),
					amount: detail.amount.toString(),
					paymentMethod: data.paymentMethod,
					bankId: data.bankId,
					// contributorMemberId:
					// 	detail.category === "member" ? detail.contributorMemberId : null,
					contributorGroupId:
						detail.category === "group" ? detail.contributorGroupId : null,
					contributorDistrictId:
						detail.category === "district"
							? toNumber(detail.contributorDistrictId)
							: null,
					contributorServiceId:
						detail.category === "service" ? detail.contributorServiceId : null,
					paymentReference: data.reference,
					narration: normalizeText(detail.narration),
					incomeType: 1,
				})),
			);

			await createJournalEntry({
				congregationId,
				transactionDate: data.contributionDate,
				lines: journalLines,
				source: { source: "Receipts", sourceId: header[0].id.toString() },
				tx,
			});

			if (data.paymentMethod !== "cash" && data.bankId) {
				await createBankingEntry({
					entry: {
						bankId: data.bankId,
						amount: totalAmount.toString(),
						dc: "debit" as DebitCredit,
						congregationId,
						transactionDate: data.contributionDate,
						narration: normalizeText(data.reference),
						source: "Receipts",
						sourceId: header[0].id.toString(),
						reference: data.reference,
						transactionMethod: "deposit",
					},
					tx,
				});
			}
		});

		return success(undefined);
	} catch (error) {
		console.error(error);
		return failure({
			type: "ApplicationError",
			message: "Failed to create receipt",
		});
	}
};

const updateReceipt = async (
	data: ReceiptsFormValues & { id: string },
	congregationId: number,
	userId: number,
) => {
	const receipt = await db.query.receiptHeader.findFirst({
		columns: { id: true, publicId: true },
		where: and(
			eq(receiptHeader.publicId, data.id),
			eq(receiptHeader.congregationId, congregationId),
			isNull(receiptHeader.deletedAt),
		),
	});

	if (!receipt) {
		return failure({
			type: "NotFoundError",
			message: "Receipt not found",
		});
	}

	const { journalLines, totalAmount } = await buildReceiptJournalLines(
		data,
		congregationId,
	);

	try {
		await db.transaction(async (tx) => {
			await tx
				.update(receiptHeader)
				.set({
					contributionDate: data.contributionDate,
					postedBy: userId,
				})
				.where(eq(receiptHeader.id, receipt.id));

			await tx
				.delete(receiptDetails)
				.where(eq(receiptDetails.headerId, receipt.id));

			await tx.insert(receiptDetails).values(
				data.details.map((detail) => ({
					headerId: receipt.id,
					category: detail.category,
					contributionAccountId: toNumber(detail.accountId),
					amount: detail.amount.toString(),
					paymentMethod: data.paymentMethod,
					bankId: data.bankId,
					// contributorMemberId:
					// 	detail.category === "member" ? detail.contributorMemberId : null,
					contributorGroupId:
						detail.category === "group" ? detail.contributorGroupId : null,
					contributorDistrictId:
						detail.category === "district"
							? toNumber(detail.contributorDistrictId)
							: null,
					contributorServiceId:
						detail.category === "service" ? detail.contributorServiceId : null,
					paymentReference: data.reference,
					narration: normalizeText(detail.narration),
					incomeType: 1,
				})),
			);

			await deleteJournalEntry({
				source: "Receipts",
				sourceId: receipt.id.toString(),
				tx,
			});

			await createJournalEntry({
				congregationId,
				transactionDate: data.contributionDate,
				lines: journalLines,
				source: { source: "Receipts", sourceId: receipt.id.toString() },
				tx,
			});

			await deleteBankingEntry({
				source: "Receipts",
				sourceId: receipt.id.toString(),
				congregationId,
				tx,
			});

			if (data.paymentMethod !== "cash" && data.bankId) {
				await createBankingEntry({
					entry: {
						bankId: data.bankId,
						amount: totalAmount.toString(),
						dc: "debit" as DebitCredit,
						congregationId,
						transactionDate: data.contributionDate,
						narration: normalizeText(data.reference),
						source: "Receipts",
						sourceId: receipt.id.toString(),
						reference: data.reference,
						transactionMethod: "deposit",
					},
					tx,
				});
			}
		});

		return success(undefined);
	} catch (error) {
		console.error(error);
		return failure({
			type: "ApplicationError",
			message: "Failed to update receipt",
		});
	}
};

const getReceiptNo = async (congregationId: number) => {
	const fiscalYear = await getFinancialYearByDate();

	const result = await db
		.select({
			receiptNo: sql<number>`MAX(${receiptHeader.receiptNo}::integer)`,
		})
		.from(receiptHeader)
		.where(
			and(
				gte(receiptHeader.contributionDate, fiscalYear.startDate),
				lte(receiptHeader.contributionDate, dateFormat(new Date())),
				eq(receiptHeader.congregationId, congregationId),
				isNull(receiptHeader.deletedAt),
			),
		);
	return (result[0]?.receiptNo || 0) + 1;
};

export const getReceiptNoServerFn = createServerFn()
	.middleware([authMiddleware])
	.handler(
		async ({
			context: {
				user: { congregationId },
			},
		}) => {
			return getReceiptNo(congregationId);
		},
	);

export const getReceipts = createServerFn()
	.middleware([authMiddleware])
	.inputValidator(receiptsValidateSearch)
	.handler(
		async ({
			data: { search, dateRange },
			context: {
				user: { congregationId },
			},
		}) => {
			const filters: Array<SQL> = [];

			if (search) {
				const searchFilters = or(
					ilike(receiptHeader.receiptNo, `%${search}%`),
					ilike(receiptDetails.narration, `%${search}%`),
					ilike(receiptDetails.paymentReference, `%${search}%`),
				);
				if (searchFilters) filters.push(searchFilters);
			}

			if (dateRange) {
				const { from, to } = normalizeDateRange(dateRange.from, dateRange.to);
				filters.push(
					gte(receiptHeader.contributionDate, from),
					lte(receiptHeader.contributionDate, to),
				);
			} else {
				const fiscalYear = await getFinancialYearByDate();
				filters.push(
					gte(receiptHeader.contributionDate, fiscalYear.startDate),
					lte(receiptHeader.contributionDate, fiscalYear.endDate),
				);
			}

			return db
				.select({
					id: receiptHeader.publicId,
					contributionDate: receiptHeader.contributionDate,
					receiptNo: receiptHeader.receiptNo,
					amount: sql<number>`COALESCE(SUM(${receiptDetails.amount}), 0)`,
					reference: receiptDetails.paymentReference,
				})
				.from(receiptHeader)
				.innerJoin(
					receiptDetails,
					eq(receiptHeader.id, receiptDetails.headerId),
				)
				.where(
					and(
						eq(receiptHeader.congregationId, congregationId),
						isNull(receiptHeader.deletedAt),
						...filters,
					),
				)
				.groupBy(
					receiptHeader.id,
					receiptHeader.contributionDate,
					receiptHeader.receiptNo,
					receiptDetails.paymentReference,
				)
				.orderBy(desc(sql`${receiptHeader.receiptNo}::integer`));
		},
	);

export const getReceipt = createServerFn()
	.middleware([authMiddleware])
	.inputValidator((receiptId: string) => receiptId)
	.handler(
		async ({
			data: receiptId,
			context: {
				user: { congregationId },
			},
		}) => {
			const receipt = await db.query.receiptHeader.findFirst({
				columns: {
					id: true,
					publicId: true,
					receiptNo: true,
					contributionDate: true,
				},
				where: and(
					eq(receiptHeader.publicId, receiptId),
					eq(receiptHeader.congregationId, congregationId),
					isNull(receiptHeader.deletedAt),
				),
				with: {
					details: true,
				},
			});

			if (!receipt || receipt.details.length === 0) {
				throw notFound();
			}

			const [firstDetail] = receipt.details;

			return {
				id: receipt.publicId,
				receiptNo: Number(receipt.receiptNo),
				contributionDate: dateFormat(receipt.contributionDate),
				paymentMethod: firstDetail.paymentMethod,
				bankId: firstDetail.bankId ?? null,
				reference: firstDetail.paymentReference ?? "",
				details: receipt.details.map((detail) => ({
					id: detail.id.toString(),
					accountId: detail.contributionAccountId,
					category: detail.category,
					contributorMemberId: detail.contributorMemberId,
					contributorGroupId: detail.contributorGroupId,
					contributorDistrictId: detail.contributorDistrictId,
					contributorCongregationId: detail.contributorCongregationId,
					contributorServiceId: detail.contributorServiceId,
					amount: Number(detail.amount),
					narration: detail.narration ?? undefined,
				})),
			} satisfies ReceiptsFormValues;
		},
	);

export const upsertReceipt = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.inputValidator(receiptsFormSchema)
	.handler(
		async ({
			data,
			context: {
				user: { congregationId, id: userId },
			},
		}) => {
			if (data.id) {
				return await updateReceipt(
					{ ...(data as ReceiptsFormValues), id: data.id },
					congregationId,
					userId,
				);
			}
			return await createReceipt(data, congregationId, userId);
		},
	);

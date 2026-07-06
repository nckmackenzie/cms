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
import z from "zod";
import { db } from "#/db";
import { type DebitCredit, receiptDetails, receiptHeader } from "#/db/schema";
import { getAccountByPublicId } from "#/features/coa/services/coa.api";
import { getDistrictId } from "#/features/districts/services/districts.api";
import { getFinancialYearByDate } from "#/features/fiscal-years/services/years.api";
import { getGroupIdFn } from "#/features/groups/services/groups.api";
import {
	type ReceiptsFormValues,
	receiptsFormSchema,
	receiptsValidateSearch,
} from "#/features/receipts/utils/schema";
import { getServiceByPublicId } from "#/features/services/services/services.api";
import { createBankingEntry, deleteBankingEntry } from "#/lib/banking";
import {
	dateFormat,
	normalizeDateRange,
	normalizeText,
	toDecimalString,
} from "#/lib/helpers";
import {
	createJournalEntry,
	deleteJournalEntry,
	getCashEquivalentAccountId,
} from "#/lib/journal";
import { failure, success } from "#/lib/result";
import { authMiddleware } from "#/middleware/auth";

type ResolvedIncomeDetail = {
	detail: ReceiptsFormValues["details"][number];
	accountId: number;
	contributorGroupId: number | null;
	contributorDistrictId: number | null;
	contributorServiceId: number | null;
};

async function resolveIncomeReferences(
	details: ReceiptsFormValues["details"],
): Promise<ResolvedIncomeDetail[]> {
	return Promise.all(
		details.map(async (detail) => {
			const [
				accountId,
				contributorDistrictId,
				contributorGroupId,
				contributorServiceId,
			] = await Promise.all([
				getAccountByPublicId({ data: detail.accountId }),
				detail.category === "district"
					? getDistrictId({
							data: { publicId: detail.contributorDistrictId as string },
						})
					: Promise.resolve(null),
				detail.category === "group"
					? getGroupIdFn({
							data: { publicId: detail.contributorGroupId as string },
						})
					: Promise.resolve(null),
				detail.category === "service"
					? getServiceByPublicId({
							data: detail.contributorServiceId as string,
						})
					: Promise.resolve(null),
			]);

			return {
				detail,
				accountId,
				contributorGroupId,
				contributorDistrictId,
				contributorServiceId,
			};
		}),
	);
}

const buildReceiptJournalLines = async (
	data: ReceiptsFormValues,
	resolvedDetails: ResolvedIncomeDetail[],
	congregationId: number,
) => {
	const journalLines = resolvedDetails.map(({ detail, accountId }, i) => ({
		accountId,
		amount: toDecimalString(detail.amount),
		dc: "credit" as DebitCredit,
		lineNumber: i + 1,
		memo: normalizeText(detail.narration),
	}));

	const totalAmount = data.details.reduce(
		(acc, detail) => acc + detail.amount,
		0,
	);

	journalLines.push({
		accountId: await getCashEquivalentAccountId({
			paymentMethod: data.paymentMethod,
			congregationId,
			bankId: data.bankId ?? undefined,
		}),
		amount: toDecimalString(totalAmount),
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
	const [resolvedDetails, bank] = await Promise.all([
		resolveIncomeReferences(data.details),
		data.bankId
			? getAccountByPublicId({ data: data.bankId })
			: Promise.resolve(null),
	]);

	const { journalLines, totalAmount } = await buildReceiptJournalLines(
		data,
		resolvedDetails,
		congregationId,
	);

	try {
		await db.transaction(async (tx) => {
			const receiptNo = await getReceiptNo({
				congregationId,
				contributionDate: data.contributionDate,
			});
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
				resolvedDetails.map(
					({
						detail,
						accountId,
						contributorGroupId,
						contributorDistrictId,
						contributorServiceId,
					}) => ({
						headerId: header[0].id,
						category: detail.category,
						contributionAccountId: accountId,
						amount: toDecimalString(detail.amount),
						paymentMethod: data.paymentMethod,
						bankId: data.paymentMethod !== "cash" ? bank : null,
						contributorGroupId,
						contributorDistrictId,
						contributorServiceId,
						paymentReference: data.reference,
						narration: normalizeText(detail.narration),
						incomeType: 1,
					}),
				),
			);

			await createJournalEntry({
				entry: {
					congregationId,
					transactionDate: data.contributionDate,
					source: "Receipts",
					sourceId: header[0].id.toString(),
				},
				lines: journalLines,
				tx,
			});

			if (data.paymentMethod !== "cash" && bank) {
				await createBankingEntry({
					entry: {
						bankId: bank,
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

	const [resolvedDetails, bank] = await Promise.all([
		resolveIncomeReferences(data.details),
		data.bankId
			? getAccountByPublicId({ data: data.bankId })
			: Promise.resolve(null),
	]);

	const { journalLines, totalAmount } = await buildReceiptJournalLines(
		data,
		resolvedDetails,
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
				resolvedDetails.map(
					({
						detail,
						accountId,
						contributorGroupId,
						contributorDistrictId,
						contributorServiceId,
					}) => ({
						headerId: receipt.id,
						category: detail.category,
						contributionAccountId: accountId,
						amount: toDecimalString(detail.amount),
						paymentMethod: data.paymentMethod,
						bankId: data.paymentMethod !== "cash" ? bank : null,
						contributorGroupId,
						contributorDistrictId,
						contributorServiceId,
						paymentReference: data.reference,
						narration: normalizeText(detail.narration),
						incomeType: 1,
					}),
				),
			);

			await deleteJournalEntry({
				source: "Receipts",
				sourceId: receipt.id.toString(),
				tx,
			});

			await createJournalEntry({
				entry: {
					congregationId,
					transactionDate: data.contributionDate,
					source: "Receipts",
					sourceId: receipt.id.toString(),
				},
				lines: journalLines,
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
						bankId: bank as number,
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

const getReceiptNo = async ({
	congregationId,
	contributionDate,
}: {
	congregationId: number;
	contributionDate: string;
}) => {
	const fiscalYear = await getFinancialYearByDate({ data: contributionDate });

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
	.validator(z.string().optional())
	.handler(
		async ({
			context: {
				user: { congregationId },
			},
			data,
		}) => {
			return getReceiptNo({
				congregationId,
				contributionDate: data ?? dateFormat(new Date()),
			});
		},
	);

export const getReceipts = createServerFn()
	.middleware([authMiddleware])
	.validator(receiptsValidateSearch)
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
	.validator((receiptId: string) => receiptId)
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
					details: {
						with: {
							contributionType: { columns: { publicId: true } },
							bank: { columns: { publicId: true } },
							contributorGroup: { columns: { publicId: true } },
							contributorDistrict: { columns: { publicId: true } },
							contributorService: { columns: { publicId: true } },
						},
					},
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
				bankId: firstDetail.bank?.publicId ?? null,
				reference: firstDetail.paymentReference ?? "",
				details: receipt.details.map((detail) => ({
					id: detail.id.toString(),
					accountId: detail.contributionType.publicId,
					category: detail.category,
					contributorGroupId: detail.contributorGroup?.publicId ?? null,
					contributorDistrictId: detail.contributorDistrict?.publicId ?? null,
					contributorServiceId: detail.contributorService?.publicId ?? null,
					amount: Number(detail.amount),
					narration: detail.narration ?? null,
				})),
			} satisfies ReceiptsFormValues;
		},
	);

export const upsertReceipt = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.validator(receiptsFormSchema)
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

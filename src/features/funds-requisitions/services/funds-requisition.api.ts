/** biome-ignore-all lint/style/noNonNullAssertion: <> */

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
import {
	churchRequisitionCategories,
	type DebitCredit,
	districts,
	fundRequisitions,
	groups,
	mmf,
} from "#/db/schema";
import { getAccountByPublicId } from "#/features/coa/services/coa.api";
import { getDistrictId } from "#/features/districts/services/districts.api";
import { getFinancialYearByDate } from "#/features/fiscal-years/services/years.api";
import {
	actionRequisitionFormValues,
	type FundsRequisitionValidateForm,
	fundsRequisitionFormValues,
	fundsRequisitionValidateSearch,
} from "#/features/funds-requisitions/utils/schema";
import { getGroupIdFn } from "#/features/groups/services/groups.api";
import { createBankingEntry } from "#/lib/banking";
import { normalizeText } from "#/lib/helpers";
import { createJournalEntry } from "#/lib/journal";
import { failure, success } from "#/lib/result";
import { stringSchema } from "#/lib/schemas";
import { authMiddleware } from "#/middleware/auth";
import { getBalance } from "#/routes/api/fund-requisitions/get-balance";

const getNextRequisitionNo = async ({
	congregationId,
}: {
	congregationId: number;
}) => {
	const [{ requisitionNo }] = await db
		.select({
			requisitionNo: sql<number>`MAX(${fundRequisitions.requisitionNo})`,
		})
		.from(fundRequisitions)
		.where(
			and(
				eq(fundRequisitions.congregationId, congregationId),
				isNull(fundRequisitions.deletedAt),
			),
		);
	return requisitionNo ? requisitionNo + 1 : 1;
};

const getChurchCategoryId = async ({
	data: { publicId, congregationId },
}: {
	data: { publicId: string; congregationId: number };
}) => {
	const [category] = await db
		.select({ id: churchRequisitionCategories.id })
		.from(churchRequisitionCategories)
		.where(
			and(
				eq(churchRequisitionCategories.publicId, publicId),
				isNull(churchRequisitionCategories.deletedAt),
				eq(churchRequisitionCategories.congregationId, congregationId),
			),
		);
	if (!category) throw new Error("Category not found");
	return category.id;
};

const getPendingRequisitionId = async ({
	publicId,
	congregationId,
}: {
	publicId: string;
	congregationId: number;
}) => {
	return await db.query.fundRequisitions.findFirst({
		columns: { deletedAt: false, approvedBy: false },
		where: and(
			eq(fundRequisitions.publicId, publicId),
			isNull(fundRequisitions.deletedAt),
			eq(fundRequisitions.congregationId, congregationId),
			eq(fundRequisitions.status, "pending"),
		),
	});
};

type ResourcesIdsProps = {
	requestType: FundsRequisitionValidateForm["requestType"];
	congregationId: number;
	groupIdParam?: string;
	districtIdParam?: string;
	churchCategoryIdParam?: string;
};

async function getResourcesIds({
	requestType,
	congregationId,
	churchCategoryIdParam,
	districtIdParam,
	groupIdParam,
}: ResourcesIdsProps) {
	const [groupId, districtId, churchCategoryId] = await Promise.all([
		requestType === "group"
			? getGroupIdFn({ data: { publicId: groupIdParam! } })
			: null,
		requestType === "district"
			? getDistrictId({ data: { publicId: districtIdParam! } })
			: null,
		requestType === "church"
			? getChurchCategoryId({
					data: { publicId: churchCategoryIdParam!, congregationId },
				})
			: null,
	]);
	return { groupId, districtId, churchCategoryId };
}

const createFundRequisition = async (
	values: FundsRequisitionValidateForm,
	congregationId: number,
	userId: number,
) => {
	const { requestType, ...rest } = values;
	if (requestType !== "church") {
		const paramId = requestType === "group" ? rest.groupId : rest.districtId;
		const balance = await getBalance({
			requestType,
			paramId: paramId!,
			requisitionDate: values.requisitionDate,
			congregationId,
		});
		if (!rest.dontDeduct && balance < values.amountRequested) {
			return failure({
				message: "Insufficient balance",
				type: "ValidationError",
			});
		}
	}

	try {
		const { groupId, districtId, churchCategoryId } = await getResourcesIds({
			requestType,
			congregationId,
			churchCategoryIdParam: rest.churchCategoryId ?? undefined,
			districtIdParam: rest.districtId ?? undefined,
			groupIdParam: rest.groupId ?? undefined,
		});

		const requisitionNo = await getNextRequisitionNo({ congregationId });

		await db.insert(fundRequisitions).values({
			requisitionDate: rest.requisitionDate,
			amountRequested: rest.amountRequested.toString(),
			requestType,
			requisitionNo,
			congregationId,
			purpose: rest.purpose,
			groupId,
			districtId,
			churchCategoryId,
			dontDeduct: rest.dontDeduct,
			requestedBy: userId,
		});

		return success(undefined);
	} catch (error) {
		console.error(error);
		return failure({
			message: "Failed to create fund requisition",
			type: "ApplicationError",
		});
	}
};

const updateRequisition = async (
	requestId: string,
	values: FundsRequisitionValidateForm,
	congregationId: number,
) => {
	const requisition = await getPendingRequisitionId({
		publicId: requestId,
		congregationId,
	});

	if (!requisition) {
		return failure({
			type: "NotFoundError",
			message: "Cannot delete the selected requisition!",
		});
	}

	const { requestType, ...rest } = values;
	if (requestType !== "church") {
		const paramId = requestType === "group" ? rest.groupId : rest.districtId;
		const balance = await getBalance({
			requestType,
			paramId: paramId!,
			requisitionDate: values.requisitionDate,
			congregationId,
		});
		if (!rest.dontDeduct && balance < values.amountRequested) {
			return failure({
				message: "Insufficient balance",
				type: "ValidationError",
			});
		}
	}

	try {
		const { groupId, districtId, churchCategoryId } = await getResourcesIds({
			requestType,
			congregationId,
			churchCategoryIdParam: rest.churchCategoryId ?? undefined,
			districtIdParam: rest.districtId ?? undefined,
			groupIdParam: rest.groupId ?? undefined,
		});

		await db
			.update(fundRequisitions)
			.set({
				requisitionDate: rest.requisitionDate,
				amountRequested: rest.amountRequested.toString(),
				requestType,
				congregationId,
				purpose: rest.purpose,
				groupId,
				districtId,
				churchCategoryId,
				dontDeduct: rest.dontDeduct,
			})
			.where(eq(fundRequisitions.id, requisition.id));

		return success(undefined);
	} catch (error) {
		console.error(error);
		return failure({
			message: "Failed to create fund requisition",
			type: "ApplicationError",
		});
	}
};

export const requisitionNoFn = createServerFn()
	.middleware([authMiddleware])
	.handler(
		async ({
			context: {
				user: { congregationId },
			},
		}) => {
			return await getNextRequisitionNo({ congregationId });
		},
	);

export const getRequisitionByPublicId = createServerFn()
	.middleware([authMiddleware])
	.inputValidator(stringSchema("Provide Requisition"))
	.handler(
		async ({
			data,
			context: {
				user: { congregationId },
			},
		}) => {
			const requisition = await db.query.fundRequisitions.findFirst({
				where: and(
					eq(fundRequisitions.publicId, data),
					isNull(fundRequisitions.deletedAt),
					eq(fundRequisitions.congregationId, congregationId),
				),
				columns: { deletedAt: false, approvedBy: false },
			});

			if (!requisition) throw Error("Requisition not found");

			return requisition;
		},
	);

export const getRequisitions = createServerFn()
	.middleware([authMiddleware])
	.inputValidator(fundsRequisitionValidateSearch)
	.handler(
		async ({
			data,
			context: {
				user: { congregationId },
			},
		}) => {
			const filters: Array<SQL> = [];

			if (data.status && data.status !== "all") {
				filters.push(eq(fundRequisitions.status, data.status));
			}

			if (data.search) {
				const searchFilters = or(
					ilike(
						sql`CAST(${fundRequisitions.amountRequested} AS TEXT)`,
						`%${data.search}%`,
					),
					ilike(
						sql`CAST(${fundRequisitions.requisitionNo} AS TEXT)`,
						`%${data.search}%`,
					),
					ilike(
						sql`COALESCE(${districts.districtName}, '')`,
						`%${data.search}%`,
					),
					ilike(sql`COALESCE(${groups.groupName}, '')`, `%${data.search}%`),
					ilike(
						sql`COALESCE(${churchRequisitionCategories.name}, '')`,
						`%${data.search}%`,
					),
				);
				if (searchFilters) filters.push(searchFilters);
			}

			const financialYear = await getFinancialYearByDate();
			if (!financialYear)
				throw new Error("No financial year found for current date!");

			return await db
				.select({
					id: fundRequisitions.publicId,
					requisitionNo: fundRequisitions.requisitionNo,
					requisitionDate: fundRequisitions.requisitionDate,
					requisitionType: fundRequisitions.requestType,
					requestedBy: sql<string>`CASE 
                                                WHEN ${fundRequisitions.districtId} IS NOT NULL THEN ${districts.districtName} 
                                                WHEN ${fundRequisitions.groupId} IS NOT NULL THEN ${groups.groupName} 
                                                WHEN ${fundRequisitions.churchCategoryId} IS NOT NULL THEN ${churchRequisitionCategories.name} 
                                            END`.as("requestedBy"),
					amount: fundRequisitions.amountRequested,
					status: fundRequisitions.status,
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
						eq(fundRequisitions.congregationId, congregationId),
						gte(fundRequisitions.requisitionDate, financialYear.startDate),
						lte(fundRequisitions.requisitionDate, financialYear.endDate),
						filters.length > 0 ? and(...filters) : undefined,
					),
				)
				.orderBy(desc(fundRequisitions.requisitionNo));
		},
	);

export const getRequisition = createServerFn()
	.middleware([authMiddleware])
	.inputValidator(stringSchema("Provide Requisition"))
	.handler(
		async ({
			data,
			context: {
				user: { congregationId },
			},
		}) => {
			const requisition = await db
				.select({
					id: fundRequisitions.publicId,
					requisitionDate: fundRequisitions.requisitionDate,
					requisitionNo: fundRequisitions.requisitionNo,
					dontDeduct: fundRequisitions.dontDeduct,
					amountRequested: fundRequisitions.amountRequested,
					districtId: districts.publicId,
					groupId: groups.publicId,
					churchCategoryId: churchRequisitionCategories.publicId,
					purpose: fundRequisitions.purpose,
					status: fundRequisitions.status,
					requestType: fundRequisitions.requestType,
					groupName: groups.groupName,
					districtName: districts.districtName,
					churchCategoryName: churchRequisitionCategories.name,
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
						eq(fundRequisitions.publicId, data),
						isNull(fundRequisitions.deletedAt),
						eq(fundRequisitions.congregationId, congregationId),
					),
				)
				.limit(1);

			if (!requisition.length) throw notFound();

			return requisition[0];
		},
	);

export const upsertFundRequistion = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.inputValidator(fundsRequisitionFormValues)
	.handler(
		async ({
			data,
			context: {
				user: { id: userId, congregationId },
			},
		}) => {
			if (!data.id) {
				return await createFundRequisition(data, congregationId, userId);
			}
			return await updateRequisition(data.id, data, congregationId);
		},
	);

export const deleteFundRequisition = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.inputValidator(stringSchema("Provide Requisition to delete"))
	.handler(
		async ({
			data,
			context: {
				user: { congregationId },
			},
		}) => {
			const requisition = await getPendingRequisitionId({
				publicId: data,
				congregationId,
			});

			if (!requisition) {
				return failure({
					type: "NotFoundError",
					message: "Cannot delete the selected requisition!",
				});
			}

			try {
				await db
					.delete(fundRequisitions)
					.where(eq(fundRequisitions.id, requisition.id));
				return success(undefined);
			} catch (error) {
				console.error(error);
				return failure({
					type: "ApplicationError",
					message: "Something went wrong while deleting selected requisition",
				});
			}
		},
	);

export const approveRequisition = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.inputValidator(actionRequisitionFormValues)
	.handler(
		async ({
			data,
			context: {
				user: { congregationId, id: userId },
			},
		}) => {
			const requisition = await getPendingRequisitionId({
				publicId: data.id,
				congregationId,
			});

			if (!requisition) {
				return failure({
					type: "NotFoundError",
					message: "Cannot approve the selected requisition!",
				});
			}

			if (data.amountApproved > Number(requisition.amountRequested)) {
				return failure({
					type: "ValidationError",
					message: "Amount approved cannot be greater than amount requested",
				});
			}

			if (
				new Date(data.paymentDate).setHours(0, 0, 0, 0) <
				new Date(requisition.requisitionDate).setHours(0, 0, 0, 0)
			) {
				return failure({
					type: "ValidationError",
					message: "Payment date cannot be before requisition date",
				});
			}

			const [debitingAccountId, creditingAccountId, bankId] = await Promise.all(
				[
					getAccountByPublicId({ data: data.debitingAccountId }),
					data.creditingAccountId
						? getAccountByPublicId({ data: data.creditingAccountId })
						: undefined,
					data.bankId ? getAccountByPublicId({ data: data.bankId }) : undefined,
				],
			);

			const narration = `Requisition ${requisition.requisitionNo} approval`;
			const journalLines = [
				{
					accountId: debitingAccountId,
					amount: data.amountApproved.toString(),
					dc: "debit" as DebitCredit,
					lineNumber: 1,
					memo: normalizeText(narration),
				},
				{
					accountId:
						data.paymentMethod === "cash" ? creditingAccountId! : bankId!,
					amount: data.amountApproved.toString(),
					dc: "credit" as DebitCredit,
					lineNumber: 2,
					memo: normalizeText(narration),
				},
			];

			try {
				await db.transaction(async (tx) => {
					await tx
						.update(fundRequisitions)
						.set({
							status: "approved",
							amountApproved: data.amountApproved.toString(),
							approvedDate: data.paymentDate,
							paymentMethod: data.paymentMethod,
							reference: normalizeText(data.reference),
							debitingAccountId,
							creditingAccountId:
								data.paymentMethod === "cash" ? creditingAccountId : null,
							bankId: data.paymentMethod !== "cash" ? bankId : null,
							approvedBy: userId,
						})
						.where(eq(fundRequisitions.id, requisition.id));

					if (!requisition.dontDeduct) {
						await tx.insert(mmf).values({
							congregationId,
							amount: data.amountApproved.toString(),
							transactionDate: data.paymentDate,
							type: requisition.requestType,
							dc: "credit",
							reference: data.reference,
							bankId,
							source: "Group Fund Approval",
							sourceId: requisition.id.toString(),
							districtId: requisition.districtId,
							groupId: requisition.groupId,
							narration,
						});
					}

					await createJournalEntry({
						congregationId,
						transactionDate: data.paymentDate,
						lines: journalLines,
						source: {
							source: "Group Fund Approval",
							sourceId: requisition.id.toString(),
						},
						tx,
					});
					if (data.paymentMethod !== "cash") {
						await createBankingEntry({
							entry: {
								amount: data.amountApproved.toString(),
								bankId: bankId!,
								congregationId,
								dc: "credit",
								reference: data.reference,
								transactionDate: data.paymentDate,
								narration: normalizeText(narration),
								source: "Group Fund Approval",
								sourceId: requisition.id.toString(),
								transactionMethod: "withdrawal",
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
					message: "Something went wrong while approving selected requisition",
				});
			}
		},
	);

export const rejectRequisition = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.inputValidator(stringSchema("Provide Requisition to reject"))
	.handler(
		async ({
			data,
			context: {
				user: { congregationId },
			},
		}) => {
			const requisition = await getPendingRequisitionId({
				publicId: data,
				congregationId,
			});

			if (!requisition) {
				return failure({
					type: "NotFoundError",
					message: "Cannot reject the selected requisition!",
				});
			}

			try {
				await db
					.update(fundRequisitions)
					.set({ status: "rejected" })
					.where(eq(fundRequisitions.id, requisition.id));
				return success(undefined);
			} catch (error) {
				console.error(error);
				return failure({
					type: "ApplicationError",
					message: "Something went wrong while rejecting selected requisition",
				});
			}
		},
	);

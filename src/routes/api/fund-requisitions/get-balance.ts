import { createFileRoute } from "@tanstack/react-router";
import { and, eq, isNull, lte, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "#/db";
import {
	FUND_REQUISITION_TYPE,
	type FundRequisitionType,
	mmf,
} from "#/db/schema";
import { getCurrentUserFn } from "#/features/auth/services/auth.api";
import { getDistrictId } from "#/features/districts/services/districts.api";
import { getGroupIdFn } from "#/features/groups/services/groups.api";

const balanceSchema = z.object({
	requestType: z.enum(
		FUND_REQUISITION_TYPE.filter((f) => f !== "church"),
		{
			error: (iss) =>
				!iss.input
					? "No request type provided"
					: "Invalid request type selected",
		},
	),
	paramId: z.string().min(1, { message: "No param provided" }),
	requisitionDate: z.iso
		.date({
			error: (iss) =>
				!iss.input ? "No date provided" : "Invalid date selected",
		})
		.refine(
			(val) =>
				new Date(val).setHours(0, 0, 0, 0) <= new Date().setHours(0, 0, 0, 0),
			{
				error: "Requisition date cannot be in the future",
			},
		),
});

export const getBalance = async ({
	requestType,
	paramId,
	requisitionDate,
	congregationId,
}: {
	requestType: FundRequisitionType;
	paramId: string;
	requisitionDate: string;
	congregationId: number;
}) => {
	let groupDistrictId: number;

	if (requestType === "group") {
		groupDistrictId = await getGroupIdFn({ data: { publicId: paramId } });
	} else {
		groupDistrictId = await getDistrictId({ data: { publicId: paramId } });
	}

	const [totals] = await db
		.select({
			debits: sql<number>`SUM(CASE WHEN ${mmf.dc} = 'debit' THEN ${mmf.amount} ELSE 0 END)`,
			credits: sql<number>`SUM(CASE WHEN ${mmf.dc} = 'credit' THEN ${mmf.amount} ELSE 0 END)`,
		})
		.from(mmf)
		.where(
			and(
				lte(mmf.transactionDate, requisitionDate),
				eq(mmf.congregationId, congregationId),
				eq(mmf.type, requestType),
				isNull(mmf.deletedAt),
				requestType === "group"
					? eq(mmf.groupId, groupDistrictId)
					: eq(mmf.districtId, groupDistrictId),
			),
		);

	const debitsTotal = totals.debits || 0;
	const creditsTotal = totals.credits || 0;
	return debitsTotal - creditsTotal;
};

export const Route = createFileRoute("/api/fund-requisitions/get-balance")({
	server: {
		handlers: {
			GET: async ({ request }) => {
				const user = await getCurrentUserFn();
				if (!user) {
					return new Response(JSON.stringify({ error: "Unauthorized" }), {
						status: 401,
						headers: { "Content-Type": "application/json" },
					});
				}
				const url = new URL(request.url);
				const paramId = url.searchParams.get("paramId");
				const requisitionDate = url.searchParams.get("requisitionDate");
				const requestType = url.searchParams.get(
					"requestType",
				) as FundRequisitionType | null;

				const result = balanceSchema.safeParse({
					requestType,
					paramId,
					requisitionDate,
				});
				if (!result.success) {
					return new Response(
						JSON.stringify({ error: "Invalid parameters provided" }),
						{
							status: 400,
							headers: { "Content-Type": "application/json" },
						},
					);
				}

				if (requestType === "group") {
					const balance = await getBalance({
						requestType: result.data.requestType,
						paramId: result.data.paramId,
						requisitionDate: result.data.requisitionDate,
						congregationId: user.congregationId,
					});
					return new Response(JSON.stringify(balance), {
						status: 200,
						headers: { "Content-Type": "application/json" },
					});
				}
				if (requestType === "district") {
					const balance = await getBalance({
						requestType: result.data.requestType,
						paramId: result.data.paramId,
						requisitionDate: result.data.requisitionDate,
						congregationId: user.congregationId,
					});
					return new Response(JSON.stringify(balance), {
						status: 200,
						headers: { "Content-Type": "application/json" },
					});
				}
			},
		},
	},
});

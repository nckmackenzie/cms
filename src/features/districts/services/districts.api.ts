import { createServerFn } from "@tanstack/react-start";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "#/db";
import { districts } from "#/db/schema";
import { authMiddleware } from "#/middleware/auth";

export const getDistrictId = createServerFn()
	.middleware([authMiddleware])
	.inputValidator((data: { publicId: string }) => data)
	.handler(
		async ({
			data,
			context: {
				user: { congregationId },
			},
		}) => {
			const { publicId } = data;
			const [result] = await db
				.select({ id: districts.id })
				.from(districts)
				.where(
					and(
						eq(districts.publicId, publicId),
						isNull(districts.deletedAt),
						eq(districts.congregationId, congregationId),
					),
				)
				.limit(1);
			if (!result) {
				throw new Error("District not found");
			}
			return result.id;
		},
	);

export const getCongregationDistricts = createServerFn()
	.middleware([authMiddleware])
	.handler(
		async ({
			context: {
				user: { congregationId },
			},
		}) => {
			return db
				.select({
					value: districts.publicId,
					label: districts.districtName,
				})
				.from(districts)
				.where(
					and(
						eq(districts.congregationId, congregationId),
						isNull(districts.deletedAt),
					),
				);
		},
	);

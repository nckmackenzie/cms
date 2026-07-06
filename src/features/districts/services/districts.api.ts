import { createServerFn } from "@tanstack/react-start";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "#/db";
import { districts } from "#/db/schema";
import { resolveIdByPublicId } from "#/lib/db-helpers";
import { authMiddleware } from "#/middleware/auth";

export const getDistrictId = createServerFn()
	.middleware([authMiddleware])
	.validator((data: { publicId: string }) => data)
	.handler(
		async ({
			data: { publicId },
			context: {
				user: { congregationId },
			},
		}) => {
			return resolveIdByPublicId(
				districts,
				and(
					eq(districts.publicId, publicId),
					isNull(districts.deletedAt),
					eq(districts.congregationId, congregationId),
				),
				"District",
			);
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

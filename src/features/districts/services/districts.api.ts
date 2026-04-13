import { createServerFn } from "@tanstack/react-start";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "#/db";
import { districts } from "#/db/schema";
import { authMiddleware } from "#/middleware/auth";

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

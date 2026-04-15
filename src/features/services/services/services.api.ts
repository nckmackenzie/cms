import { createServerFn } from "@tanstack/react-start";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "#/db";
import { services } from "#/db/schema";
import { authMiddleware } from "#/middleware/auth";

export const getCongregationServices = createServerFn()
	.middleware([authMiddleware])
	.handler(
		async ({
			context: {
				user: { congregationId },
			},
		}) => {
			return db
				.select({
					value: services.publicId,
					label: services.name,
				})
				.from(services)
				.where(
					and(
						eq(services.congregationId, congregationId),
						isNull(services.deletedAt),
					),
				);
		},
	);

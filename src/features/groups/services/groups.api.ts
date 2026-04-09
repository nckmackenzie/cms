import { createServerFn } from "@tanstack/react-start";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "#/db";
import { groups } from "#/db/schema";
import { authMiddleware } from "#/middleware/auth";

export const getCongregationGroups = createServerFn()
	.middleware([authMiddleware])
	.handler(
		async ({
			context: {
				user: { congregationId },
			},
		}) => {
			return db
				.select({
					value: groups.id,
					label: groups.groupName,
				})
				.from(groups)
				.where(
					and(
						eq(groups.congregationId, congregationId),
						isNull(groups.deletedAt),
					),
				);
		},
	);

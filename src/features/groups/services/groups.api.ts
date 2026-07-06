import { createServerFn } from "@tanstack/react-start";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "#/db";
import { groups } from "#/db/schema";
import { resolveIdByPublicId } from "#/lib/db-helpers";
import { authMiddleware } from "#/middleware/auth";

export const getGroupIdFn = createServerFn()
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
				groups,
				and(
					eq(groups.publicId, publicId),
					isNull(groups.deletedAt),
					eq(groups.congregationId, congregationId),
				),
				"Group",
			);
		},
	);

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
					value: groups.publicId,
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

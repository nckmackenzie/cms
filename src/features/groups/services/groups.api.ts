import { createServerFn } from "@tanstack/react-start";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "#/db";
import { groups } from "#/db/schema";
import { authMiddleware } from "#/middleware/auth";

export const getGroupIdFn = createServerFn()
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
				.select({ id: groups.id })
				.from(groups)
				.where(
					and(
						eq(groups.publicId, publicId),
						isNull(groups.deletedAt),
						eq(groups.congregationId, congregationId),
					),
				)
				.limit(1);
			if (!result) {
				throw new Error("Group not found");
			}
			return result.id;
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

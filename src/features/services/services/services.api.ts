import { createServerFn } from "@tanstack/react-start";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "#/db";
import { services } from "#/db/schema";
import { resolveIdByPublicId } from "#/lib/db-helpers";
import { stringSchema } from "#/lib/schemas";
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

export const getServiceByPublicId = createServerFn()
	.middleware([authMiddleware])
	.validator(stringSchema("Service Id is required"))
	.handler(
		async ({
			data,
			context: {
				user: { congregationId },
			},
		}) => {
			return resolveIdByPublicId(
				services,
				and(
					eq(services.congregationId, congregationId),
					eq(services.publicId, data),
					isNull(services.deletedAt),
				),
				"Service",
			);
		},
	);

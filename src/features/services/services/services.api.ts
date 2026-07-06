import { createServerFn } from "@tanstack/react-start";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "#/db";
import { services } from "#/db/schema";
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
			const service = await db.query.services.findFirst({
				columns: { id: true },
				where: and(
					eq(services.congregationId, congregationId),
					eq(services.publicId, data),
					isNull(services.deletedAt),
				),
			});

			if (!service) {
				throw new Error("Service not found");
			}

			return service.id;
		},
	);

import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { asc } from "drizzle-orm";
import { db } from "#/db";
import { congregations } from "#/db/schema";
import { LoginPage } from "#/features/auth/components/login-page";
import { seo } from "#/lib/seo";
import { toTitleCase } from "#/lib/utils";

export const getCongregations = createServerFn({ method: "GET" }).handler(
	async () => {
		return db.query.congregations
			.findMany({
				columns: { id: true, congregationName: true },
				orderBy: asc(congregations.congregationName),
			})
			.then((d) =>
				d.map((c) => ({
					value: c.id.toString(),
					label: toTitleCase(c.congregationName),
				})),
			);
	},
);

export const Route = createFileRoute("/(auth)/login")({
	component: LoginPage,
	head: () => ({ meta: [...seo({ title: "Login" })] }),
	loader: async () => {
		return {
			congregations: await getCongregations(),
		};
	},
});

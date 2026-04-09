import { z } from "zod";
import { CONTRIBUTION_CATEGORIES, PAYMENT_METHODS } from "#/db/schema";
import { queryValidateSearch } from "#/lib/schemas";

export const receiptsValidateSearch = queryValidateSearch.safeExtend({
	dateRange: z
		.object({
			from: z.iso.date(),
			to: z.iso.date(),
		})
		.superRefine((data, ctx) => {
			if (new Date(data.from) > new Date(data.to)) {
				ctx.addIssue({
					code: "custom",
					message: "From date must be before to date",
					path: ["from"],
				});
			}
		})
		.optional(),
});

export const receiptsFormSchema = z
	.object({
		id: z.string().optional(),
		receiptNo: z
			.number()
			.min(1, "Receipt number is required")
			.positive({ error: "Receipt number must be a positive number" }),
		contributionDate: z.iso
			.date({
				error: (iss) => (!iss.input ? "Date is required" : "Invalid date"),
			})
			.refine(
				(val) =>
					new Date(val).setHours(0, 0, 0, 0) <= new Date().setHours(0, 0, 0, 0),
				{ error: "Date must be before today" },
			),
		paymentMethod: z.enum(PAYMENT_METHODS),
		bankId: z.number().min(1, { error: "Invalid bank selected" }).nullish(),
		reference: z.string().min(1, "Reference is required"),
		details: z.array(
			z
				.object({
					id: z.string(),
					accountId: z.number().min(1, "Account is required"),
					category: z.enum(CONTRIBUTION_CATEGORIES),
					contributorMemberId: z.number().nullish(),
					contributorGroupId: z.number().nullish(),
					contributorDistrictId: z.number().nullish(),
					contributorCongregationId: z.number().nullish(),
					contributorServiceId: z.number().nullish(),
					amount: z
						.number()
						.min(1, "Amount is required")
						.positive({ error: "Amount must be a positive number" }),
					narration: z.string().optional(),
				})
				.superRefine((data, ctx) => {
					if (data.category === "group" && !data.contributorGroupId) {
						ctx.addIssue({
							code: "custom",
							message: "Group is required",
							path: ["contributorGroupId"],
						});
					}
					if (data.category === "member" && !data.contributorMemberId) {
						ctx.addIssue({
							code: "custom",
							message: "Member is required",
							path: ["contributorMemberId"],
						});
					}
					if (data.category === "district" && !data.contributorDistrictId) {
						ctx.addIssue({
							code: "custom",
							message: "District is required",
							path: ["contributorDistrictId"],
						});
					}
					if (
						data.category === "congregation" &&
						!data.contributorCongregationId
					) {
						ctx.addIssue({
							code: "custom",
							message: "Congregation is required",
							path: ["contributorCongregationId"],
						});
					}
					if (data.category === "service" && !data.contributorServiceId) {
						ctx.addIssue({
							code: "custom",
							message: "Service is required",
							path: ["contributorServiceId"],
						});
					}
				}),
		),
	})
	.superRefine((data, ctx) => {
		if (data.paymentMethod !== "cash" && !data.bankId) {
			ctx.addIssue({
				code: "custom",
				message: "Bank is required",
				path: ["bankId"],
			});
		}
	});

export type ReceiptsValidateSearch = z.infer<typeof receiptsValidateSearch>;
export type ReceiptsFormValues = z.infer<typeof receiptsFormSchema>;

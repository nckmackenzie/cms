import { z } from "zod";
import { PAYMENT_METHODS } from "#/db/schema";

export const sheetSchema = z.object({
	sheet: z.enum(["new", "edit"]).optional(),
});

export const queryValidateSearch = z.object({
	search: z.string().optional().catch(""),
});
export const queryValidateSearchWithSheet = queryValidateSearch.safeExtend({
	sheet: z.enum(["new", "edit"]).optional(),
});

export const stringSchema = (errorMessage: string) =>
	z.string().trim().min(1, { error: errorMessage });

export const nullableTrimmedString = z
	.string()
	.trim()
	.transform((value) => (value === "" ? undefined : value))
	.optional()
	.nullable();

export const paymentMethodSchema = () =>
	z.enum(PAYMENT_METHODS, {
		error: (iss) =>
			!iss.input ? "Select payment method" : "Invalid payment method selected",
	});

export const dateSchema = (errorMessage: string) =>
	z.iso
		.date({
			error: (iss) => (!iss.input ? errorMessage : "Invalid date"),
		})
		.refine(
			(val) => {
				const inputDate = new Date(`${val}T00:00:00`);
				const today = new Date();
				inputDate.setHours(0, 0, 0, 0);
				today.setHours(0, 0, 0, 0);
				return inputDate <= today;
			},
			{ error: "Date cannot be in the future" },
		);

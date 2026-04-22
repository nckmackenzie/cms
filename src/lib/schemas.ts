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
	z.string().min(1, { error: errorMessage });

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
			(val) =>
				new Date(val).setHours(0, 0, 0, 0) <= new Date().setHours(0, 0, 0, 0),
			{ error: "Payment date cannot be in the future" },
		);

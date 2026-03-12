import { z } from "zod";

export const loginFormSchema = z.object({
	username: z.string().min(1, { error: "username is required" }),
	password: z
		.string()
		.min(1, { error: "Password is required" }),
	congregationId: z.string().min(1, { error: "Select your congregation" }),
});

export const changePasswordFormSchema = z.object({
	otpCode: z
		.string()
		.trim()
		.length(6, { error: "Enter the 6-digit code sent by SMS" })
		.regex(/^\d{6}$/, { error: "Verification code must be 6 digits" }),
	password: z
		.string()
		.min(1, { error: "Password is required" })
		.refine((val) => val.length >= 6, {
			error: "Short password! Needs to be six characters or more",
		}),
	confirmPassword: z.string().min(1, { error: "Confirm password is required" }),
}).superRefine((data, ctx) => {
	if (data.password !== data.confirmPassword) {
		ctx.addIssue({
			code: 'custom',
			message: "Passwords do not match",
			path: ['confirmPassword'],
		});
	}
});

export type LoginFormSchema = z.infer<typeof loginFormSchema>;
export type ChangePasswordFormSchema = z.infer<typeof changePasswordFormSchema>;

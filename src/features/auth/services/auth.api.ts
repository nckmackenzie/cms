import { redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { and, eq, sql } from "drizzle-orm";
import { db } from "#/db";
import { users } from "#/db/schema";
import {
	changePasswordFormSchema,
	forgotPasswordFormSchema,
	loginFormSchema,
} from "#/features/auth/services/schema";
import {
	buildPasswordResetSmsMessage,
	generatePasswordResetCode,
	getMinutesUntil,
	getSecondsUntil,
	hashPassword,
	hashPasswordResetCode,
	LOGIN_LOCKOUT_MINUTES,
	LOGIN_MAX_ATTEMPTS,
	maskPhoneNumber,
	normalizePhoneNumber,
	PASSWORD_RESET_CODE_TTL_MINUTES,
	PASSWORD_RESET_LOCKOUT_MINUTES,
	PASSWORD_RESET_MAX_ATTEMPTS,
	PASSWORD_RESET_RESEND_COOLDOWN_SECONDS,
	verifyPassword,
} from "#/features/auth/utils/helpers";
import { useAppSession } from "#/lib/auth";
import { failure, success } from "#/lib/result";
import { sendSms } from "#/lib/sms/africas-talking";

type PasswordResetChallengeUser = Pick<
	typeof users.$inferSelect,
	| "id"
	| "active"
	| "contact"
	| "lastLogin"
	| "passwordResetAttemptCount"
	| "passwordResetCodeExpiresAt"
	| "passwordResetCodeHash"
	| "passwordResetCodeSentAt"
	| "passwordResetLockedUntil"
>;

type LoginChallengeUser = Pick<
	typeof users.$inferSelect,
	"id" | "loginAttemptCount" | "loginLockedUntil"
>;

async function findUserByUsernameAndCongregation(
	username: string,
	congregationId: number,
) {
	let user = await db.query.users.findFirst({
		where: and(
			eq(sql`trim(lower(${users.userId}))`, username.trim().toLowerCase()),
			eq(users.congregationId, congregationId),
		),
	});

	if (!user) {
		const superAdminUser = await db.query.users.findFirst({
			where: and(
				eq(sql`trim(lower(${users.userId}))`, username.trim().toLowerCase()),
				eq(users.userType, "super admin"),
			),
		});

		user = superAdminUser ?? undefined;
	}

	return user;
}

async function getPasswordResetUserOrRedirect() {
	// biome-ignore lint/correctness/useHookAtTopLevel: <not your ordinary hook>
	const session = await useAppSession();

	if (!session.data.mustChangePassword || !session.data.passwordResetUserId) {
		throw redirect({ to: "/login" });
	}

	const user = await db.query.users.findFirst({
		columns: {
			id: true,
			active: true,
			contact: true,
			lastLogin: true,
			passwordResetAttemptCount: true,
			passwordResetCodeExpiresAt: true,
			passwordResetCodeHash: true,
			passwordResetCodeSentAt: true,
			passwordResetLockedUntil: true,
		},
		where: eq(users.id, session.data.passwordResetUserId),
	});

	if (!user || !user.active || user.lastLogin !== null) {
		await session.clear();
		throw redirect({ to: "/login" });
	}

	return { session, user };
}

async function issuePasswordResetCode(
	user: PasswordResetChallengeUser,
	options?: { forceResend?: boolean },
) {
	const now = new Date();
	const forceResend = options?.forceResend === true;

	if (!user.contact) {
		return failure({
			message:
				"This account does not have a registered phone number for SMS verification.",
			type: "AuthenticationError",
		});
	}

	if (user.passwordResetLockedUntil && user.passwordResetLockedUntil > now) {
		return failure({
			message: `Too many invalid codes. Try again in ${getMinutesUntil(user.passwordResetLockedUntil)} minute(s).`,
			type: "AuthenticationError",
		});
	}

	const resendAvailableAt = user.passwordResetCodeSentAt
		? new Date(
				user.passwordResetCodeSentAt.getTime() +
					PASSWORD_RESET_RESEND_COOLDOWN_SECONDS * 1000,
			)
		: null;

	if (forceResend && resendAvailableAt && resendAvailableAt > now) {
		return failure({
			message: `Wait ${getSecondsUntil(resendAvailableAt)} second(s) before requesting another code.`,
			type: "AuthenticationError",
		});
	}

	if (
		!forceResend &&
		user.passwordResetCodeHash &&
		user.passwordResetCodeExpiresAt &&
		user.passwordResetCodeExpiresAt > now
	) {
		return success({
			maskedPhone: maskPhoneNumber(user.contact),
			resent: false,
		});
	}

	const code = generatePasswordResetCode();
	const hashedCode = hashPasswordResetCode(user.id, code);
	const expiresAt = new Date(
		now.getTime() + PASSWORD_RESET_CODE_TTL_MINUTES * 60 * 1000,
	);
	const normalizedPhone = normalizePhoneNumber(user.contact);

	await db
		.update(users)
		.set({
			passwordResetCodeHash: hashedCode,
			passwordResetCodeExpiresAt: expiresAt,
			passwordResetCodeSentAt: now,
			passwordResetAttemptCount: 0,
			passwordResetLockedUntil: null,
		})
		.where(eq(users.id, user.id));

	try {
		await sendSms({
			message: buildPasswordResetSmsMessage(code),
			to: [normalizedPhone],
		});
	} catch {
		return failure({
			message:
				"Unable to send the verification SMS right now. Please try again.",
			type: "ApplicationError",
		});
	}

	return success({
		maskedPhone: maskPhoneNumber(normalizedPhone),
		resent: true,
	});
}

async function registerFailedLoginAttempt(user: LoginChallengeUser) {
	const now = new Date();
	const nextAttemptCount =
		user.loginLockedUntil && user.loginLockedUntil <= now
			? 1
			: user.loginAttemptCount + 1;
	const shouldLockAccount = nextAttemptCount >= LOGIN_MAX_ATTEMPTS;

	await db
		.update(users)
		.set({
			loginAttemptCount: shouldLockAccount ? 0 : nextAttemptCount,
			loginLockedUntil: shouldLockAccount
				? new Date(now.getTime() + LOGIN_LOCKOUT_MINUTES * 60 * 1000)
				: null,
		})
		.where(eq(users.id, user.id));

	return shouldLockAccount;
}

export const loginFn = createServerFn({ method: "POST" })
	.inputValidator(loginFormSchema)
	.handler(async ({ data }) => {
		const congregationId = Number(data.congregationId);
		const user = await findUserByUsernameAndCongregation(
			data.username,
			congregationId,
		);

		if (!user || !user.active) {
			return failure({
				message: "Invalid username or password",
				type: "AuthenticationError",
			});
		}

		const now = new Date();

		if (user.loginLockedUntil && user.loginLockedUntil > now) {
			return failure({
				message: `Too many login attempts. Try again in ${getMinutesUntil(user.loginLockedUntil)} minute(s).`,
				type: "AuthenticationError",
			});
		}

		// biome-ignore lint/correctness/useHookAtTopLevel: <not your ordinary hook>
		const session = await useAppSession();
		await session.clear();

		if (user.lastLogin === null) {
			await session.update({
				mustChangePassword: true,
				passwordResetUserId: user.id,
				passwordResetReason: "first_login",
			});

			const issuedCode = await issuePasswordResetCode(user);

			if (!issuedCode.success) {
				await session.clear();
				return issuedCode;
			}

			throw redirect({ to: "/change-password" });
		}

		const passwordMatches = await verifyPassword(data.password, user.password);

		if (!passwordMatches) {
			const shouldLockAccount = await registerFailedLoginAttempt(user);

			return failure({
				message: shouldLockAccount
					? `Too many login attempts. Try again in ${LOGIN_LOCKOUT_MINUTES} minute(s).`
					: "Invalid username or password",
				type: "AuthenticationError",
			});
		}

		// Rollback reference:
		// await session.update({
		// 	id: user.id,
		// 	congregationId: user.congregationId,
		// 	userName: user.userName,
		// 	userType: user.userType,
		// });
		await session.update(
			{
				id: user.id,
				congregationId: user.congregationId,
				userName: user.userName,
				userType: user.userType,
			},
			{ rememberMe: data.rememberMe, type: "auth", userId: user.id },
		);

		await db
			.update(users)
			.set({
				lastLogin: new Date(),
				loginAttemptCount: 0,
				loginLockedUntil: null,
			})
			.where(eq(users.id, user.id));

		return success(undefined);
	});

export const requestPasswordResetFn = createServerFn({ method: "POST" })
	.inputValidator(forgotPasswordFormSchema)
	.handler(async ({ data }) => {
		const congregationId = Number(data.congregationId);
		const user = await findUserByUsernameAndCongregation(
			data.username,
			congregationId,
		);

		if (!user || !user.active || !user.contact) {
			return success({
				message:
					"If the account can be reset, an SMS verification code will be sent to the registered phone number.",
			});
		}

		// biome-ignore lint/correctness/useHookAtTopLevel: <not your ordinary hook>
		const session = await useAppSession();
		await session.clear();
		await session.update({
			mustChangePassword: true,
			passwordResetUserId: user.id,
			passwordResetReason: "forgot_password",
		});

		const issuedCode = await issuePasswordResetCode(user);

		if (!issuedCode.success) {
			await session.clear();

			if (issuedCode.error.type === "ApplicationError") {
				return issuedCode;
			}

			return success({
				message:
					"If the account can be reset, an SMS verification code will be sent to the registered phone number.",
			});
		}

		throw redirect({ to: "/change-password" });
	});

export const getPasswordResetChallengeFn = createServerFn({
	method: "GET",
}).handler(async () => {
	const { session, user } = await getPasswordResetUserOrRedirect();

	if (!user.contact) {
		throw redirect({ to: "/login" });
	}

	const resendAvailableAt = user.passwordResetCodeSentAt
		? new Date(
				user.passwordResetCodeSentAt.getTime() +
					PASSWORD_RESET_RESEND_COOLDOWN_SECONDS * 1000,
			)
		: null;

	return {
		reason: session.data.passwordResetReason ?? "forgot_password",
		maskedPhone: maskPhoneNumber(user.contact),
		expiresAt: user.passwordResetCodeExpiresAt?.toISOString() ?? null,
		resendAvailableAt: resendAvailableAt?.toISOString() ?? null,
	};
});

export const resendPasswordResetCodeFn = createServerFn({
	method: "POST",
}).handler(async () => {
	const { user } = await getPasswordResetUserOrRedirect();
	const issuedCode = await issuePasswordResetCode(user, { forceResend: true });

	if (!issuedCode.success) {
		return issuedCode;
	}

	return success({
		maskedPhone: issuedCode.data.maskedPhone,
	});
});

export const changePasswordFn = createServerFn({ method: "POST" })
	.inputValidator(changePasswordFormSchema)
	.handler(async ({ data }) => {
		const { session, user } = await getPasswordResetUserOrRedirect();
		const now = new Date();

		if (user.passwordResetLockedUntil && user.passwordResetLockedUntil > now) {
			return failure({
				message: `Too many invalid codes. Try again in ${getMinutesUntil(user.passwordResetLockedUntil)} minute(s).`,
				type: "AuthenticationError",
			});
		}

		if (
			!user.passwordResetCodeHash ||
			!user.passwordResetCodeExpiresAt ||
			user.passwordResetCodeExpiresAt <= now
		) {
			return failure({
				message:
					"Your verification code has expired. Request a new code and try again.",
				type: "AuthenticationError",
			});
		}

		const expectedCodeHash = hashPasswordResetCode(user.id, data.otpCode);

		if (expectedCodeHash !== user.passwordResetCodeHash) {
			const nextAttemptCount = user.passwordResetAttemptCount + 1;
			const shouldLockAccount = nextAttemptCount >= PASSWORD_RESET_MAX_ATTEMPTS;

			await db
				.update(users)
				.set({
					passwordResetAttemptCount: nextAttemptCount,
					passwordResetLockedUntil: shouldLockAccount
						? new Date(
								now.getTime() + PASSWORD_RESET_LOCKOUT_MINUTES * 60 * 1000,
							)
						: null,
				})
				.where(eq(users.id, user.id));

			return failure({
				message: shouldLockAccount
					? `Too many invalid codes. Try again in ${PASSWORD_RESET_LOCKOUT_MINUTES} minute(s).`
					: "Invalid verification code",
				type: "AuthenticationError",
			});
		}

		const hashedPassword = await hashPassword(data.password);

		await db
			.update(users)
			.set({
				password: hashedPassword,
				lastLogin: now,
				passwordResetCodeHash: null,
				passwordResetCodeExpiresAt: null,
				passwordResetCodeSentAt: null,
				passwordResetAttemptCount: 0,
				passwordResetLockedUntil: null,
			})
			.where(eq(users.id, user.id));

		await session.clear();

		return success(undefined);
	});

export const logoutFn = createServerFn({ method: "POST" }).handler(async () => {
	const session = await useAppSession();
	await session.clear();
	return success(undefined);
});

export const getCurrentUserFn = createServerFn({ method: "GET" }).handler(
	async () => {
		const session = await useAppSession();
		const userId = session.data.id;

		if (!userId) {
			return null;
		}

		const user = await db.query.users.findFirst({
			columns: {
				id: true,
				userId: true,
				userName: true,
				congregationId: true,
				userType: true,
			},
			where: eq(users.id, userId),
		});

		if (!user) {
			await session.clear();
			return null;
		}

		return user;
	},
);

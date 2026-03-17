import { createHmac, randomInt } from "node:crypto";
import { compare, hash } from "bcryptjs";

export const PASSWORD_RESET_CODE_LENGTH = 6;
export const PASSWORD_RESET_CODE_TTL_MINUTES = 10;
export const PASSWORD_RESET_RESEND_COOLDOWN_SECONDS = 60;
export const PASSWORD_RESET_MAX_ATTEMPTS = 5;
export const PASSWORD_RESET_LOCKOUT_MINUTES = 15;
export const LOGIN_MAX_ATTEMPTS = 3;
export const LOGIN_LOCKOUT_MINUTES = 15;

export const hashPassword = async (password: string) =>
	await hash(password, Number(process.env.BCRYPT_ROUNDS));

function getPasswordResetSecret() {
	const secret = process.env.SMS_OTP_SECRET ?? process.env.SESSION_SECRET;

	if (!secret) {
		throw new Error(
			"Missing SMS_OTP_SECRET or SESSION_SECRET for password reset code hashing.",
		);
	}

	return secret;
}

export function hashPasswordResetCode(userId: number, code: string) {
	return createHmac("sha256", getPasswordResetSecret())
		.update(`${userId}:${code}`)
		.digest("hex");
}

export function generatePasswordResetCode() {
	return randomInt(0, 10 ** PASSWORD_RESET_CODE_LENGTH)
		.toString()
		.padStart(PASSWORD_RESET_CODE_LENGTH, "0");
}

export function normalizePhoneNumber(phoneNumber: string) {
	const digitsOnly = phoneNumber.replace(/[^\d+]/g, "");
	const defaultCountryCode = process.env.SMS_DEFAULT_COUNTRY_CODE ?? "+254";
	const defaultCountryCodeDigits = defaultCountryCode.replace(/\D/g, "");

	if (digitsOnly.startsWith("+")) {
		return digitsOnly;
	}

	const numericPhone = digitsOnly.replace(/\D/g, "");

	if (numericPhone.startsWith(defaultCountryCodeDigits)) {
		return `+${numericPhone}`;
	}

	if (numericPhone.startsWith("0")) {
		return `${defaultCountryCode}${numericPhone.slice(1)}`;
	}

	return `${defaultCountryCode}${numericPhone}`;
}

export function maskPhoneNumber(phoneNumber: string) {
	const normalized = normalizePhoneNumber(phoneNumber);

	if (normalized.length <= 4) {
		return normalized;
	}

	return `${normalized.slice(0, 4)}${"*".repeat(
		Math.max(normalized.length - 7, 3),
	)}${normalized.slice(-3)}`;
}

export function buildPasswordResetSmsMessage(code: string) {
	return `Your password reset code is ${code}. It expires in ${PASSWORD_RESET_CODE_TTL_MINUTES} minutes.`;
}

export function getMinutesUntil(date: Date) {
	return Math.max(1, Math.ceil((date.getTime() - Date.now()) / 60000));
}

export function getSecondsUntil(date: Date) {
	return Math.max(1, Math.ceil((date.getTime() - Date.now()) / 1000));
}

export async function verifyPassword(password: string, storedHash: string) {
	if (storedHash.startsWith("$2y$")) {
		return compare(password, storedHash.replace("$2y$", "$2b$"));
	}

	if (
		storedHash.startsWith("$2a$") ||
		storedHash.startsWith("$2b$") ||
		storedHash.startsWith("$2x$")
	) {
		return compare(password, storedHash);
	}

	return false;
}

import {
	deleteCookie,
	getCookie,
	getRequestHeader,
	getRequestIP,
	getRequestProtocol,
	setCookie,
} from "@tanstack/react-start/server";
import { and, eq, gt } from "drizzle-orm";
import { jwtVerify, SignJWT } from "jose";
import { db } from "#/db";
import { sessions, type users } from "#/db/schema";

// Rollback reference: previous cookie-only TanStack session implementation.
// import { useSession } from "@tanstack/react-start/server";
//
// export function useAppSession() {
// 	return useSession<AppSessionData>({
// 		name: "cms",
// 		password: process.env.SESSION_SECRET as string,
// 		cookie: {
// 			secure: process.env.NODE_ENV === "production",
// 			sameSite: "lax",
// 			httpOnly: true,
// 			maxAge: 24 * 60 * 60,
// 		},
// 	});
// }

export type AppSessionData = {
	id?: number;
	userName?: string;
	congregationId?: number;
	userType?: typeof users.$inferSelect.userType;
	mustChangePassword?: boolean;
	passwordResetUserId?: number;
	passwordResetReason?: "first_login" | "forgot_password";
};

type AppSessionType = "auth" | "password_reset";

type SessionJwtPayload = {
	sid: number;
	typ: AppSessionType;
	v: 1;
};

type SessionRow = typeof sessions.$inferSelect;

type SessionUpdateOptions = {
	type?: AppSessionType;
	rememberMe?: boolean;
	userId?: number | null;
};

type AppSessionManager = {
	data: AppSessionData;
	update: (
		update: Partial<AppSessionData>,
		options?: SessionUpdateOptions,
	) => Promise<void>;
	clear: () => Promise<void>;
	type: AppSessionType | null;
};

const COOKIE_NAME = "cms";
const AUTH_SESSION_MS = 24 * 60 * 60 * 1000;
const REMEMBER_ME_SESSION_MS = 30 * 24 * 60 * 60 * 1000;
const PASSWORD_RESET_SESSION_MS = 30 * 60 * 1000;
const JWT_ALGORITHM = "HS256";

function getAuthSecret() {
	const secret = process.env.AUTH_SESSION_SECRET ?? process.env.SESSION_SECRET;

	if (!secret) {
		throw new Error("Missing AUTH_SESSION_SECRET or SESSION_SECRET.");
	}

	return new TextEncoder().encode(secret);
}

function getCookieOptions(maxAgeMs: number) {
	return {
		path: "/",
		httpOnly: true,
		sameSite: "lax" as const,
		secure:
			process.env.NODE_ENV === "production" || getRequestProtocol() === "https",
		maxAge: Math.floor(maxAgeMs / 1000),
	};
}

function getSessionLifetimeMs(type: AppSessionType, rememberMe: boolean) {
	if (type === "password_reset") {
		return PASSWORD_RESET_SESSION_MS;
	}

	return rememberMe ? REMEMBER_ME_SESSION_MS : AUTH_SESSION_MS;
}

function getRefreshThresholdMs(session: SessionRow) {
	return getSessionLifetimeMs(session.type, session.rememberMe) / 2;
}

function inferSessionType(data: Partial<AppSessionData>): AppSessionType {
	if (data.id) {
		return "auth";
	}

	return "password_reset";
}

function inferUserId(
	data: Partial<AppSessionData>,
	options?: SessionUpdateOptions,
	currentUserId?: number | null,
) {
	if (options?.userId !== undefined) {
		return options.userId;
	}

	if (data.id) {
		return data.id;
	}

	if (data.passwordResetUserId) {
		return data.passwordResetUserId;
	}

	return currentUserId ?? null;
}

function isObject(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

function toAppSessionData(value: unknown): AppSessionData {
	if (!isObject(value)) {
		return {};
	}

	const result: AppSessionData = {};

	if (typeof value.id === "number") {
		result.id = value.id;
	}

	if (typeof value.userName === "string") {
		result.userName = value.userName;
	}

	if (typeof value.congregationId === "number") {
		result.congregationId = value.congregationId;
	}

	if (
		value.userType === "super admin" ||
		value.userType === "admin" ||
		value.userType === "standard user"
	) {
		result.userType = value.userType;
	}

	if (typeof value.mustChangePassword === "boolean") {
		result.mustChangePassword = value.mustChangePassword;
	}

	if (typeof value.passwordResetUserId === "number") {
		result.passwordResetUserId = value.passwordResetUserId;
	}

	if (
		value.passwordResetReason === "first_login" ||
		value.passwordResetReason === "forgot_password"
	) {
		result.passwordResetReason = value.passwordResetReason;
	}

	return result;
}

async function hashToken(token: string) {
	const digest = await crypto.subtle.digest(
		"SHA-256",
		new TextEncoder().encode(token),
	);
	return Buffer.from(digest).toString("hex");
}

async function signSessionToken(payload: SessionJwtPayload) {
	return await new SignJWT(payload)
		.setProtectedHeader({ alg: JWT_ALGORITHM, typ: "JWT" })
		.sign(getAuthSecret());
}

async function verifySessionToken(token: string) {
	const verified = await jwtVerify<SessionJwtPayload>(token, getAuthSecret(), {
		algorithms: [JWT_ALGORITHM],
	});

	if (
		typeof verified.payload.sid !== "number" ||
		(verified.payload.typ !== "auth" &&
			verified.payload.typ !== "password_reset") ||
		verified.payload.v !== 1
	) {
		throw new Error("Invalid session token.");
	}

	return verified.payload;
}

function getClientMetadata() {
	const forwardedIp = getRequestIP({ xForwardedFor: true });
	const directIp = getRequestIP();

	return {
		ipAddress: forwardedIp ?? directIp ?? null,
		userAgent: getRequestHeader("user-agent") ?? null,
	};
}

async function deleteSessionRow(sessionId: number) {
	await db.delete(sessions).where(eq(sessions.id, sessionId));
}

async function clearSessionCookie() {
	deleteCookie(COOKIE_NAME, {
		path: "/",
		httpOnly: true,
		sameSite: "lax",
		secure:
			process.env.NODE_ENV === "production" || getRequestProtocol() === "https",
	});
}

async function persistSessionCookie(token: string, session: SessionRow) {
	setCookie(
		COOKIE_NAME,
		token,
		getCookieOptions(getSessionLifetimeMs(session.type, session.rememberMe)),
	);
}

async function createPersistedSession(
	data: AppSessionData,
	options?: SessionUpdateOptions,
) {
	const type = options?.type ?? inferSessionType(data);
	const rememberMe = type === "auth" ? (options?.rememberMe ?? false) : false;
	const userId = inferUserId(data, options);
	const now = new Date();
	const expiresAt = new Date(
		now.getTime() + getSessionLifetimeMs(type, rememberMe),
	);
	const metadata = getClientMetadata();

	const [createdSession] = await db
		.insert(sessions)
		.values({
			userId,
			type,
			tokenHash: null,
			expiresAt,
			lastAccessedAt: now,
			rememberMe,
			ipAddress: metadata.ipAddress,
			userAgent: metadata.userAgent,
			data,
			createdAt: now,
			updatedAt: now,
		})
		.returning();

	if (!createdSession) {
		throw new Error("Failed to create session");
	}

	const token = await signSessionToken({
		sid: createdSession.id,
		typ: createdSession.type,
		v: 1,
	});
	const tokenHash = await hashToken(token);

	const [session] = await db
		.update(sessions)
		.set({
			tokenHash,
			updatedAt: new Date(),
		})
		.where(eq(sessions.id, createdSession.id))
		.returning();

	if (!session) {
		throw new Error("Failed to update session with token hash");
	}

	await persistSessionCookie(token, session);

	return { session, data };
}

async function refreshSession(session: SessionRow, token: string) {
	if (session.type !== "auth") {
		return session;
	}

	const now = new Date();

	if (
		session.expiresAt.getTime() - now.getTime() >
		getRefreshThresholdMs(session)
	) {
		return session;
	}

	const expiresAt = new Date(
		now.getTime() + getSessionLifetimeMs(session.type, session.rememberMe),
	);
	const metadata = getClientMetadata();
	const [updatedSession] = await db
		.update(sessions)
		.set({
			expiresAt,
			lastAccessedAt: now,
			ipAddress: metadata.ipAddress,
			userAgent: metadata.userAgent,
			updatedAt: now,
		})
		.where(eq(sessions.id, session.id))
		.returning();

	await persistSessionCookie(token, updatedSession);

	return updatedSession;
}

async function getCurrentSessionRecord() {
	const token = getCookie(COOKIE_NAME);

	if (!token) {
		return null;
	}

	try {
		const payload = await verifySessionToken(token);
		const tokenHash = await hashToken(token);
		const session = await db.query.sessions.findFirst({
			where: and(
				eq(sessions.id, payload.sid),
				eq(sessions.tokenHash, tokenHash),
				gt(sessions.expiresAt, new Date()),
			),
		});

		if (!session) {
			await clearSessionCookie();
			return null;
		}

		const refreshedSession = await refreshSession(session, token);

		return {
			session: refreshedSession,
			data: toAppSessionData(refreshedSession.data),
		};
	} catch {
		await clearSessionCookie();
		return null;
	}
}

export async function useAppSession(): Promise<AppSessionManager> {
	let current = await getCurrentSessionRecord();

	return {
		get data() {
			return current?.data ?? {};
		},
		get type() {
			return current?.session.type ?? null;
		},
		update: async (update, options) => {
			const nextData = {
				...(current?.data ?? {}),
				...update,
			};

			if (current?.session) {
				await deleteSessionRow(current.session.id);
			}

			current = await createPersistedSession(nextData, {
				type:
					options?.type ?? current?.session.type ?? inferSessionType(nextData),
				rememberMe: options?.rememberMe ?? current?.session.rememberMe ?? false,
				userId: inferUserId(nextData, options, current?.session.userId ?? null),
			});
		},
		clear: async () => {
			if (current?.session) {
				await deleteSessionRow(current.session.id);
				current = null;
			}

			await clearSessionCookie();
		},
	};
}

import { relations } from "drizzle-orm";
import {
	boolean,
	date,
	index,
	integer,
	jsonb,
	pgEnum,
	pgTable,
	serial,
	timestamp,
	uniqueIndex,
	varchar,
} from "drizzle-orm/pg-core";

export const USER_TYPES = ["super admin", "admin", "standard user"] as const;
export const userTypeEnum = pgEnum("user_type_enum", USER_TYPES);
export const ACCOUNT_TYPES = [
	"asset",
	"liability",
	"equity",
	"income",
	"expense",
] as const;
export const accountTypeEnum = pgEnum("account_type_enum", ACCOUNT_TYPES);
export const NORMAL_BALANCES = ["debit", "credit"] as const;
export type DebitCredit = (typeof NORMAL_BALANCES)[number];
export const normalBalanceEnum = pgEnum("normal_balance_enum", NORMAL_BALANCES);
export const SESSION_TYPES = ["auth", "password_reset"] as const;
export const sessionTypeEnum = pgEnum("session_type_enum", SESSION_TYPES);

export const congregations = pgTable(
	"congregations",
	{
		id: serial("id").primaryKey(),
		parishName: varchar("parish_name", { length: 255 }),
		congregationName: varchar("congregation_name", { length: 255 }).notNull(),
		contact: varchar("contact", { length: 15 }),
		email: varchar("email", { length: 255 }),
		address: varchar("address", { length: 255 }),
		aboutUs: varchar("about_us", { length: 255 }),
		isParish: boolean("is_parish").default(false),
		prefix: varchar("prefix", { length: 50 }),
		inaugurationDate: date("inauguration_date"),
		sactuaryType: varchar("sactuary_type", { length: 15 }),
		yearStarted: integer("year_started"),
		foundationStone: date("foundation_stone"),
		dedicationDate: date("dedication_date"),
		deletedAt: timestamp("deleted_at"),
	},
	(table) => [
		index("congregations_congregation_name_idx").on(table.congregationName),
		index("congregations_prefix_idx").on(table.prefix),
	],
);

export const roles = pgTable(
	"roles",
	{
		id: serial("id").primaryKey(),
		roleName: varchar("role_name", { length: 100 }).notNull(),
		deletedAt: timestamp("deleted_at"),
	},
	(table) => [uniqueIndex("roles_role_name_unique").on(table.roleName)],
);

export const districts = pgTable(
	"districts",
	{
		id: serial("id").primaryKey(),
		districtName: varchar("district_name", { length: 255 }).notNull(),
		deletedAt: timestamp("deleted_at"),
		congregationId: integer("congregation_id")
			.notNull()
			.references(() => congregations.id),
	},
	(table) => [
		index("districts_congregation_id_idx").on(table.congregationId),
		index("districts_district_name_idx").on(table.districtName),
		uniqueIndex("districts_congregation_id_district_name_unique").on(
			table.congregationId,
			table.districtName,
		),
	],
);

export const ledgerAccounts = pgTable(
	"ledger_accounts",
	{
		id: serial("id").primaryKey(),
		name: varchar("name", { length: 255 }).notNull(),
		accountType: accountTypeEnum("account_type").notNull(),
		parentId: integer("parent_id"),
		description: varchar("description", { length: 255 }),
		isBank: boolean("is_bank").notNull().default(false),
		accountNo: varchar("account_no", { length: 100 }),
		forGroup: boolean("for_group").notNull().default(false),
		isPosting: boolean("is_posting").notNull().default(false),
		normalBalance: normalBalanceEnum("normal_balance").notNull(),
		isEditable: boolean("is_editable").notNull().default(true),
		active: boolean("active").notNull().default(true),
		congregationId: integer("congregation_id").references(
			() => congregations.id,
		),
		deletedAt: timestamp("deleted_at"),
	},
	(table) => [
		index("ledger_accounts_name_idx").on(table.name),
		index("ledger_accounts_account_type_idx").on(table.accountType),
		index("ledger_accounts_parent_id_idx").on(table.parentId),
		index("ledger_accounts_congregation_id_idx").on(table.congregationId),
		index("ledger_accounts_active_idx").on(table.active),
		uniqueIndex("ledger_accounts_congregation_id_account_no_unique").on(
			table.congregationId,
			table.accountNo,
		),
	],
);

export const users = pgTable(
	"users",
	{
		id: serial("id").primaryKey(),
		userId: varchar("user_id", { length: 100 }).notNull(),
		userName: varchar("user_name", { length: 255 }).notNull(),
		userType: userTypeEnum("user_type").notNull().default("standard user"),
		password: varchar("password", { length: 255 }).notNull(),
		active: boolean("active").notNull().default(true),
		contact: varchar("contact", { length: 15 }),
		districtId: integer("district_id").references(() => districts.id),
		congregationId: integer("congregation_id")
			.notNull()
			.references(() => congregations.id),
		roleId: integer("role_id").references(() => roles.id),
		transferId: integer("transfer_id"),
		lastLogin: timestamp("last_login"),
		loginAttemptCount: integer("login_attempt_count").notNull().default(0),
		loginLockedUntil: timestamp("login_locked_until"),
		passwordResetCodeHash: varchar("password_reset_code_hash", { length: 255 }),
		passwordResetCodeExpiresAt: timestamp("password_reset_code_expires_at"),
		passwordResetCodeSentAt: timestamp("password_reset_code_sent_at"),
		passwordResetAttemptCount: integer("password_reset_attempt_count")
			.notNull()
			.default(0),
		passwordResetLockedUntil: timestamp("password_reset_locked_until"),
		// resetToken: varchar("reset_token"),
	},
	(table) => [
		uniqueIndex("users_user_id_congregation_unique").on(
			table.userId,
			table.congregationId,
		),
		index("users_district_id_idx").on(table.districtId),
		index("users_congregation_id_idx").on(table.congregationId),
		index("users_role_id_idx").on(table.roleId),
	],
);

export const sessions = pgTable(
	"sessions",
	{
		id: serial("id").primaryKey(),
		userId: integer("user_id").references(() => users.id),
		type: sessionTypeEnum("type").notNull(),
		tokenHash: varchar("token_hash", { length: 255 }),
		expiresAt: timestamp("expires_at").notNull(),
		lastAccessedAt: timestamp("last_accessed_at"),
		rememberMe: boolean("remember_me").notNull().default(false),
		ipAddress: varchar("ip_address", { length: 255 }),
		userAgent: varchar("user_agent", { length: 512 }),
		data: jsonb("data").$type<Record<string, unknown>>().notNull(),
		createdAt: timestamp("created_at").notNull().defaultNow(),
		updatedAt: timestamp("updated_at").notNull().defaultNow(),
	},
	(table) => [
		uniqueIndex("sessions_token_hash_unique").on(table.tokenHash),
		index("sessions_user_id_idx").on(table.userId),
		index("sessions_expires_at_idx").on(table.expiresAt),
	],
);

export const congregationsRelations = relations(congregations, ({ many }) => ({
	districts: many(districts),
	ledgerAccounts: many(ledgerAccounts),
	users: many(users),
}));

export const rolesRelations = relations(roles, ({ many }) => ({
	users: many(users),
}));

export const districtsRelations = relations(districts, ({ one, many }) => ({
	congregation: one(congregations, {
		fields: [districts.congregationId],
		references: [congregations.id],
	}),
	users: many(users),
}));

export const ledgerAccountsRelations = relations(
	ledgerAccounts,
	({ one, many }) => ({
		congregation: one(congregations, {
			fields: [ledgerAccounts.congregationId],
			references: [congregations.id],
		}),
		parent: one(ledgerAccounts, {
			fields: [ledgerAccounts.parentId],
			references: [ledgerAccounts.id],
			relationName: "ledger_account_parent_child",
		}),
		children: many(ledgerAccounts, {
			relationName: "ledger_account_parent_child",
		}),
	}),
);

export const usersRelations = relations(users, ({ one, many }) => ({
	congregation: one(congregations, {
		fields: [users.congregationId],
		references: [congregations.id],
	}),
	district: one(districts, {
		fields: [users.districtId],
		references: [districts.id],
	}),
	role: one(roles, {
		fields: [users.roleId],
		references: [roles.id],
	}),
	sessions: many(sessions),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
	user: one(users, {
		fields: [sessions.userId],
		references: [users.id],
	}),
}));

import { relations, sql } from "drizzle-orm";
import {
	boolean,
	check,
	date,
	index,
	integer,
	jsonb,
	numeric,
	pgEnum,
	pgTable,
	serial,
	text,
	timestamp,
	uniqueIndex,
	varchar,
} from "drizzle-orm/pg-core";
import { createdAt, id } from "#/db/helpers";

export const USER_TYPES = ["super admin", "admin", "standard user"] as const;
export const userTypeEnum = pgEnum("user_type_enum", USER_TYPES);
export const ACCOUNT_TYPES = [
	"asset",
	"liability",
	"equity",
	"income",
	"expense",
] as const;
export const PAYMENT_METHODS = ["cash", "mpesa", "bank", "cheque"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];
export const paymentMethodEnum = pgEnum("payment_method_enum", PAYMENT_METHODS);

export const CONTRIBUTION_CATEGORIES = [
	"member",
	"group",
	"district",
	"service",
	"congregation",
] as const;
export type ContributionCategory = (typeof CONTRIBUTION_CATEGORIES)[number];
export const contributionCategoryEnum = pgEnum(
	"contribution_category_enum",
	CONTRIBUTION_CATEGORIES,
);

export const accountTypeEnum = pgEnum("account_type_enum", ACCOUNT_TYPES);
export const NORMAL_BALANCES = ["debit", "credit"] as const;
export type DebitCredit = (typeof NORMAL_BALANCES)[number];
export const normalBalanceEnum = pgEnum("normal_balance_enum", NORMAL_BALANCES);
export const SESSION_TYPES = ["auth", "password_reset"] as const;
export const sessionTypeEnum = pgEnum("session_type_enum", SESSION_TYPES);
export const lineDcEnum = pgEnum("line_dc", NORMAL_BALANCES);

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

export const groups = pgTable(
	"groups",
	{
		id,
		groupName: text("group_name").notNull(),
		active: boolean("active").notNull().default(true),
		deletedAt: timestamp("deleted_at"),
		congregationId: integer("congregation_id")
			.notNull()
			.references(() => congregations.id),
	},
	(table) => [
		index("groups_congregation_id_idx").on(table.congregationId),
		uniqueIndex("groups_congregation_id_group_name_unique").on(
			table.congregationId,
			table.groupName,
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

export const services = pgTable(
	"services",
	{
		id,
		name: varchar("name").notNull(),
		serviceTime: varchar("service_time").notNull(),
		active: boolean("active").notNull().default(true),
		deletedAt: timestamp("deleted_at"),
		congregationId: integer("congregation_id")
			.notNull()
			.references(() => congregations.id),
	},
	(table) => [
		index("services_congregation_id_idx").on(table.congregationId),
		uniqueIndex("services_congregation_id_service_name_unique").on(
			table.congregationId,
			table.name,
		),
	],
);

export const subAccounts = pgTable(
	"sub_accounts",
	{
		id,
		name: varchar("name").notNull(),
		bankId: integer("bank_id").references(() => ledgerAccounts.id),
		accountId: integer("account_id").references(() => ledgerAccounts.id),
		groupId: varchar("group_id").references(() => groups.id),
		districtId: integer("district_id").references(() => districts.id),
		deletedAt: timestamp("deleted_at"),
	},
	(table) => [uniqueIndex("subaccounts_name_unique").on(table.name)],
);

export const receiptHeader = pgTable(
	"receipt_header",
	{
		id,
		receiptNo: varchar("receipt_no", { length: 15 }),
		contributionDate: date("contribution_date").notNull(),
		postedBy: integer("posted_by")
			.notNull()
			.references(() => users.id),
		congregationId: integer("congregation_id")
			.notNull()
			.references(() => congregations.id),
		createdAt,
		deletedAt: timestamp("deleted_at"),
	},
	(table) => [
		index("receipt_header_posted_by_idx").on(table.postedBy),
		index("receipt_header_congregation_id_idx").on(table.congregationId),
		index("receipt_header_receipt_no_idx").on(table.receiptNo),
		index("receipt_header_contribution_date_idx").on(table.contributionDate),
	],
);

export const receiptDetails = pgTable(
	"receipt_details",
	{
		id: serial("id").primaryKey(),
		headerId: varchar("header_id")
			.notNull()
			.references(() => receiptHeader.id),
		contributionAccountId: integer("contribution_account_id")
			.notNull()
			.references(() => ledgerAccounts.id),
		paymentMethod: paymentMethodEnum("payment_method").notNull(),
		bankId: integer("bank_id").references(() => ledgerAccounts.id),
		amount: numeric("amount", { precision: 18, scale: 2 }).notNull(),
		category: contributionCategoryEnum("category").notNull(),
		contributorMemberId: varchar("contributor_member_id"),
		contributorGroupId: varchar("contributor_group_id").references(
			() => groups.id,
		),
		contributorDistrictId: integer("contributor_district_id").references(
			() => districts.id,
		),
		contributorServiceId: varchar("contributor_service_id").references(
			() => services.id,
		),
		contributorCongregationId: integer(
			"contributor_congregation_id",
		).references(() => congregations.id),
		paymentReference: varchar("payment_reference", { length: 255 }),
		narration: varchar("narration", { length: 50 }),
		incomeType: integer("income_type").notNull(),
		forGroup: boolean("for_group").notNull().default(false),
		subaccountId: varchar("sub_account_id").references(() => subAccounts.id),
	},
	(table) => [
		check(
			"receipt_details_one_contributor_check",
			sql`(
				(CASE WHEN ${table.contributorMemberId} IS NOT NULL THEN 1 ELSE 0 END) +
				(CASE WHEN ${table.contributorGroupId} IS NOT NULL THEN 1 ELSE 0 END) +
				(CASE WHEN ${table.contributorDistrictId} IS NOT NULL THEN 1 ELSE 0 END) +
				(CASE WHEN ${table.contributorServiceId} IS NOT NULL THEN 1 ELSE 0 END) +
				(CASE WHEN ${table.contributorCongregationId} IS NOT NULL THEN 1 ELSE 0 END)
			) = 1`,
		),
		index("receipt_details_header_id_idx").on(table.headerId),
		index("receipt_details_contribution_account_id_idx").on(
			table.contributionAccountId,
		),
		index("receipt_details_bank_id_idx").on(table.bankId),
	],
);

export const journalEntries = pgTable(
	"journal_entries",
	{
		id,
		transactionDate: date("transaction_date").notNull(),
		lineNumber: integer("line_number").notNull(),
		accountId: integer("account_id")
			.notNull()
			.references(() => ledgerAccounts.id),
		dc: lineDcEnum("dc").notNull(), // 'DEBIT' or 'CREDIT'
		amount: numeric("amount", { precision: 18, scale: 2 }).notNull(),
		memo: text("memo"),
		reference: varchar("reference", { length: 255 }),
		source: varchar("source", { length: 255 }),
		sourceId: varchar("source_id", { length: 255 }),
		journalNo: integer("journal_no"),
		congregationId: integer("congregation_id").references(
			() => congregations.id,
		),
		deletedAt: timestamp("deleted_at"),
	},
	(table) => [
		index("journal_entries_transaction_date_idx").on(table.transactionDate),
		index("journal_entries_account_id_idx").on(table.accountId),
		index("journal_entries_congregation_id_idx").on(table.congregationId),
		index("journal_entries_journal_no_idx").on(table.journalNo),
		index("journal_entries_line_number_idx").on(table.lineNumber),
		index("journal_entries_reference_idx").on(table.reference),
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
	groups: many(groups),
	ledgerAccounts: many(ledgerAccounts),
	receiptHeaders: many(receiptHeader),
	services: many(services),
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
	subAccounts: many(subAccounts),
	users: many(users),
}));

export const groupsRelations = relations(groups, ({ one, many }) => ({
	congregation: one(congregations, {
		fields: [groups.congregationId],
		references: [congregations.id],
	}),
	subAccounts: many(subAccounts),
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
		journalEntries: many(journalEntries),
		receiptContributionTypes: many(receiptDetails, {
			relationName: "receipt_contribution_type",
		}),
		receiptBanks: many(receiptDetails, {
			relationName: "receipt_bank",
		}),
		subAccountsBank: many(subAccounts, {
			relationName: "sub_accounts_bank",
		}),
		subAccountsAccount: many(subAccounts, {
			relationName: "sub_accounts_account",
		}),
	}),
);

export const receiptHeaderRelations = relations(
	receiptHeader,
	({ one, many }) => ({
		postedBy: one(users, {
			fields: [receiptHeader.postedBy],
			references: [users.id],
		}),
		congregation: one(congregations, {
			fields: [receiptHeader.congregationId],
			references: [congregations.id],
		}),
		details: many(receiptDetails),
	}),
);

export const receiptDetailsRelations = relations(receiptDetails, ({ one }) => ({
	header: one(receiptHeader, {
		fields: [receiptDetails.headerId],
		references: [receiptHeader.id],
	}),
	contributionType: one(ledgerAccounts, {
		fields: [receiptDetails.contributionAccountId],
		references: [ledgerAccounts.id],
		relationName: "receipt_contribution_type",
	}),
	bank: one(ledgerAccounts, {
		fields: [receiptDetails.bankId],
		references: [ledgerAccounts.id],
		relationName: "receipt_bank",
	}),
	contributorGroup: one(groups, {
		fields: [receiptDetails.contributorGroupId],
		references: [groups.id],
	}),
	contributorDistrict: one(districts, {
		fields: [receiptDetails.contributorDistrictId],
		references: [districts.id],
	}),
	contributorService: one(services, {
		fields: [receiptDetails.contributorServiceId],
		references: [services.id],
	}),
	contributorCong: one(congregations, {
		fields: [receiptDetails.contributorCongregationId],
		references: [congregations.id],
	}),
	subaccount: one(subAccounts, {
		fields: [receiptDetails.subaccountId],
		references: [subAccounts.id],
	}),
}));

export const journalEntriesRelations = relations(journalEntries, ({ one }) => ({
	account: one(ledgerAccounts, {
		fields: [journalEntries.accountId],
		references: [ledgerAccounts.id],
	}),
	congregation: one(congregations, {
		fields: [journalEntries.congregationId],
		references: [congregations.id],
	}),
}));

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
	receiptHeaders: many(receiptHeader),
	sessions: many(sessions),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
	user: one(users, {
		fields: [sessions.userId],
		references: [users.id],
	}),
}));

export const servicesRelations = relations(services, ({ one, many }) => ({
	congregation: one(congregations, {
		fields: [services.congregationId],
		references: [congregations.id],
	}),
	receiptDetails: many(receiptDetails),
}));

export const subAccountsRelations = relations(subAccounts, ({ one }) => ({
	bank: one(ledgerAccounts, {
		fields: [subAccounts.bankId],
		references: [ledgerAccounts.id],
		relationName: "sub_accounts_bank",
	}),
	account: one(ledgerAccounts, {
		fields: [subAccounts.accountId],
		references: [ledgerAccounts.id],
		relationName: "sub_accounts_account",
	}),
	group: one(groups, {
		fields: [subAccounts.groupId],
		references: [groups.id],
	}),
	district: one(districts, {
		fields: [subAccounts.districtId],
		references: [districts.id],
	}),
}));

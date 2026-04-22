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
	text,
	timestamp,
	uniqueIndex,
	uuid,
	varchar,
} from "drizzle-orm/pg-core";
import { createdAt } from "#/db/helpers";

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

export const BANK_TRANSACTION_METHODS = [
	"deposit",
	"withdrawal",
	"charges",
	"b/f",
	"transfers",
	"inter-transfer(sub accounts)",
] as const;
export type BankTransactionMethod = (typeof BANK_TRANSACTION_METHODS)[number];
export const bankTransactionMethodEnum = pgEnum(
	"bank_transaction_method_enum",
	BANK_TRANSACTION_METHODS,
);

export const FUND_REQUISITION_STATUS = [
	"pending",
	"approved",
	"rejected",
] as const;
export type FundRequisitionStatus = (typeof FUND_REQUISITION_STATUS)[number];
export const fundRequisitionStatusEnum = pgEnum(
	"fund_requisition_status_enum",
	FUND_REQUISITION_STATUS,
);
export const FUND_REQUISITION_TYPE = ["group", "district", "church"] as const;
export type FundRequisitionType = (typeof FUND_REQUISITION_TYPE)[number];
export const fundRequisitionTypeEnum = pgEnum(
	"fund_requisition_type_enum",
	FUND_REQUISITION_TYPE,
);
export const EXPENSE_TYPES = ["church", "group", "district"] as const;
export type ExpenseType = (typeof EXPENSE_TYPES)[number];
export const expenseTypeEnum = pgEnum("expense_type_enum", EXPENSE_TYPES);

export const congregations = pgTable(
	"congregations",
	{
		id: integer().primaryKey().generatedByDefaultAsIdentity(),
		publicId: uuid("public_id").defaultRandom().unique().notNull(),
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
		id: integer().primaryKey().generatedByDefaultAsIdentity(),
		roleName: varchar("role_name", { length: 100 }).notNull(),
		deletedAt: timestamp("deleted_at"),
	},
	(table) => [uniqueIndex("roles_role_name_unique").on(table.roleName)],
);

export const districts = pgTable(
	"districts",
	{
		id: integer().primaryKey().generatedByDefaultAsIdentity(),
		publicId: uuid("public_id").defaultRandom().unique().notNull(),
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
		id: integer().primaryKey().generatedByDefaultAsIdentity(),
		publicId: uuid("public_id").defaultRandom().unique().notNull(),
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
		id: integer().primaryKey().generatedByDefaultAsIdentity(),
		publicId: uuid("public_id").defaultRandom().unique().notNull(),
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
		id: integer().primaryKey().generatedByDefaultAsIdentity(),
		publicId: uuid("public_id").defaultRandom().unique().notNull(),
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
		id: integer().primaryKey().generatedByDefaultAsIdentity(),
		publicId: uuid("public_id").defaultRandom().unique().notNull(),
		name: varchar("name").notNull(),
		bankId: integer("bank_id").references(() => ledgerAccounts.id),
		accountId: integer("account_id").references(() => ledgerAccounts.id),
		groupId: integer("group_id").references(() => groups.id),
		districtId: integer("district_id").references(() => districts.id),
		deletedAt: timestamp("deleted_at"),
	},
	(table) => [uniqueIndex("subaccounts_name_unique").on(table.name)],
);

export const fiscalYears = pgTable(
	"fiscal_years",
	{
		id: integer().primaryKey().generatedByDefaultAsIdentity(),
		publicId: uuid("public_id").defaultRandom().unique().notNull(),
		yearName: text("year_name").notNull(),
		startDate: date("start_date").notNull(),
		endDate: date("end_date").notNull(),
		closed: boolean("closed").notNull().default(false),
		createdDate: date("created_date").notNull(),
		closedDate: date("closed_date"),
		prefixReferences: boolean("prefix_references").notNull().default(false),
		deletedAt: timestamp("deleted_at"),
	},
	(table) => [index("fiscal_years_year_name_idx").on(table.yearName)],
);

export const receiptHeader = pgTable(
	"receipt_header",
	{
		id: integer().primaryKey().generatedByDefaultAsIdentity(),
		publicId: uuid("public_id").defaultRandom().unique().notNull(),
		receiptNo: varchar("receipt_no", { length: 15 }).notNull(),
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
		id: integer().primaryKey().generatedByDefaultAsIdentity(),
		headerId: integer("header_id")
			.notNull()
			.references(() => receiptHeader.id),
		contributionAccountId: integer("contribution_account_id")
			.notNull()
			.references(() => ledgerAccounts.id),
		paymentMethod: paymentMethodEnum("payment_method").notNull(),
		bankId: integer("bank_id").references(() => ledgerAccounts.id),
		amount: numeric("amount", { precision: 18, scale: 2 }).notNull(),
		category: contributionCategoryEnum("category").notNull(),
		contributorMemberId: integer("contributor_member_id"),
		contributorGroupId: integer("contributor_group_id").references(
			() => groups.id,
		),
		contributorDistrictId: integer("contributor_district_id").references(
			() => districts.id,
		),
		contributorServiceId: integer("contributor_service_id").references(
			() => services.id,
		),
		contributorCongregationId: integer(
			"contributor_congregation_id",
		).references(() => congregations.id),
		paymentReference: varchar("payment_reference", { length: 255 }),
		narration: varchar("narration", { length: 50 }),
		incomeType: integer("income_type").notNull().default(1),
		forGroup: boolean("for_group").notNull().default(false),
		subaccountId: integer("sub_account_id").references(() => subAccounts.id),
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
		id: integer().primaryKey().generatedByDefaultAsIdentity(),
		publicId: uuid("public_id").defaultRandom().unique().notNull(),
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

export const expensesHeader = pgTable(
	"expenses_header",
	{
		id: integer().primaryKey().generatedByDefaultAsIdentity(),
		publicId: uuid("public_id").defaultRandom().unique().notNull(),
		expenseDate: date("expense_date").notNull(),
		voucherNo: integer("voucher_no").notNull(),
		expenseType: expenseTypeEnum("expense_type").notNull(),
		groupId: integer("group_id").references(() => groups.id),
		districtId: integer("district_id").references(() => districts.id),
		paymentMethod: paymentMethodEnum("payment_method").notNull(),
		reference: varchar("reference"),
		bankId: integer("bank_id").references(() => ledgerAccounts.id),
		creditingAccountId: integer("crediting_account_id").references(
			() => ledgerAccounts.id,
		),
		requisitionId: integer("requisition_id").references(
			() => fundRequisitions.id,
		),
		status: fundRequisitionStatusEnum("status").notNull().default("pending"),
		congregationId: integer("congregation_id")
			.references(() => congregations.id)
			.notNull(),
		createdAt,
		deletedAt: timestamp("deleted_at"),
	},
	(table) => [
		index("expenses_header_expense_date_idx").on(table.expenseDate),
		index("expenses_header_voucher_no_idx").on(table.voucherNo),
		index("expenses_header_expense_type_idx").on(table.expenseType),
		index("expenses_header_group_id_idx").on(table.groupId),
		index("expenses_header_district_id_idx").on(table.districtId),
		index("expenses_header_reference_idx").on(table.reference),
		index("expenses_header_status_idx").on(table.status),
		index("expenses_header_congregation_id_idx").on(table.congregationId),
	],
);

export const expensesDetail = pgTable(
	"expenses_detail",
	{
		id: varchar("id").primaryKey().notNull(),
		expenseId: integer("expense_id")
			.notNull()
			.references(() => expensesHeader.id),
		accountId: integer("account_id")
			.notNull()
			.references(() => ledgerAccounts.id),
		description: varchar("description", { length: 255 }),
		amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
	},
	(table) => [
		index("expenses_detail_expense_id_idx").on(table.expenseId),
		index("expenses_detail_account_id_idx").on(table.accountId),
	],
);

export const users = pgTable(
	"users",
	{
		id: integer().primaryKey().generatedByDefaultAsIdentity(),
		publicId: uuid("public_id").defaultRandom().unique().notNull(),
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

export const bankPostings = pgTable(
	"bank_postings",
	{
		id: integer().primaryKey().generatedByDefaultAsIdentity(),
		publicId: uuid("public_id").defaultRandom().unique().notNull(),
		transactionDate: date("transaction_date").notNull(),
		bankId: integer("bank_id")
			.notNull()
			.references(() => ledgerAccounts.id),
		dc: lineDcEnum("dc").notNull(),
		amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
		transactionMethod:
			bankTransactionMethodEnum("transaction_method").notNull(),
		reference: varchar("reference", { length: 255 }).notNull(),
		counterAccountId: integer("counter_account_id").references(
			() => ledgerAccounts.id,
		),
		cleared: boolean("cleared").default(false),
		clearedAt: date("cleared_at"),
		narration: varchar("narration", { length: 255 }),
		source: varchar("source_type", { length: 50 }),
		sourceId: varchar("source_id", { length: 50 }),
		congregationId: integer("congregation_id")
			.notNull()
			.references(() => congregations.id),
		deletedAt: timestamp("deleted_at"),
		createdAt: timestamp("created_at").notNull().defaultNow(),
	},
	(table) => [
		index("bank_postings_bank_id_idx").on(table.bankId),
		index("bank_postings_transaction_date_idx").on(table.transactionDate),
		index("bank_postings_reference_idx").on(table.reference),
	],
);

export const pettyCash = pgTable(
	"petty_cash",
	{
		id: integer().primaryKey().generatedByDefaultAsIdentity(),
		publicId: uuid("public_id").defaultRandom().unique().notNull(),
		receiptNo: integer("receipt_no"),
		transactionDate: date("transaction_date").notNull(),
		amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
		dc: lineDcEnum("dc").notNull(),
		isReceipt: boolean("is_receipt").notNull().default(false),
		bankId: integer("bank_id").references(() => ledgerAccounts.id),
		reference: varchar("reference", { length: 255 }),
		narration: varchar("narration", { length: 255 }),
		source: varchar("source_type", { length: 50 }),
		sourceId: varchar("source_id", { length: 50 }),
		congregationId: integer("congregation_id")
			.notNull()
			.references(() => congregations.id),
		deletedAt: timestamp("deleted_at"),
	},
	(table) => [
		index("petty_cash_transaction_date_idx").on(table.transactionDate),
		index("petty_cash_receipt_no_idx").on(table.receiptNo),
		index("petty_cash_reference_idx").on(table.reference),
		index("petty_cash_congregation_id_idx").on(table.congregationId),
	],
);

export const sessions = pgTable(
	"sessions",
	{
		id: integer().primaryKey().generatedByDefaultAsIdentity(),
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

export const churchRequisitionCategories = pgTable(
	"church_requisition_categories",
	{
		id: integer().primaryKey().generatedByDefaultAsIdentity(),
		publicId: uuid("public_id").defaultRandom().unique().notNull(),
		name: varchar("name", { length: 255 }).notNull(),
		congregationId: integer("congregation_id")
			.notNull()
			.references(() => congregations.id),
		deletedAt: timestamp("deleted_at"),
	},
);

export const fundRequisitions = pgTable(
	"fund_requisitions",
	{
		id: integer().primaryKey().generatedByDefaultAsIdentity(),
		publicId: uuid("public_id").defaultRandom().unique().notNull(),
		requisitionNo: integer("requisition_no").notNull(),
		requisitionDate: date("requisition_date").notNull(),
		requestType: fundRequisitionTypeEnum("request_type").notNull(),
		districtId: integer("district_id").references(() => districts.id),
		groupId: integer("group_id").references(() => groups.id),
		churchCategoryId: integer("church_category_id").references(
			() => churchRequisitionCategories.id,
		),
		purpose: varchar("purpose", { length: 255 }).notNull(),
		status: fundRequisitionStatusEnum("status").notNull().default("pending"),
		amountRequested: numeric("amount_requested", {
			precision: 10,
			scale: 2,
		}).notNull(),
		amountApproved: numeric("amount_approved", {
			precision: 10,
			scale: 2,
		}),
		requestedBy: integer("requested_by").references(() => users.id),
		approvedBy: integer("approved_by").references(() => users.id),
		approvedDate: date("approved_date"),
		dontDeduct: boolean("dont_deduct").notNull().default(false),
		rejectionReason: varchar("rejection_reason", { length: 255 }),
		congregationId: integer("congregation_id")
			.notNull()
			.references(() => congregations.id),
		paymentMethod: paymentMethodEnum("payment_method"),
		reference: varchar("reference", { length: 255 }),
		debitingAccountId: integer("debiting_account_id").references(
			() => ledgerAccounts.id,
		),
		creditingAccountId: integer("crediting_account_id").references(
			() => ledgerAccounts.id,
		),
		bankId: integer("bank_id").references(() => ledgerAccounts.id),
		deletedAt: timestamp("deleted_at"),
	},
	(t) => [
		index("fund_requisitions_requisition_no_idx").on(t.requisitionNo),
		index("fund_requisitions_requisition_date_idx").on(t.requisitionDate),
		index("fund_requisitions_request_type_idx").on(t.requestType),
		index("fund_requisitions_status_idx").on(t.status),
		index("fund_requisitions_congregation_id_idx").on(t.congregationId),
		index("fund_requisitions_reference_idx").on(t.reference),
	],
);

export const mmf = pgTable(
	"mmfs",
	{
		id: integer().primaryKey().generatedByDefaultAsIdentity(),
		publicId: uuid("public_id").defaultRandom().unique().notNull(),
		transactionDate: date("transaction_date").notNull(),
		type: fundRequisitionTypeEnum("request_type").notNull(),
		groupId: integer("group_id").references(() => groups.id),
		districtId: integer("district_id").references(() => districts.id),
		dc: lineDcEnum("dc").notNull(),
		amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
		bankId: integer("bank_id").references(() => ledgerAccounts.id),
		subAccountId: integer("sub_account_id").references(() => subAccounts.id),
		reference: varchar("reference", { length: 255 }),
		narration: varchar("narration", { length: 255 }),
		source: varchar("source_type", { length: 50 }),
		sourceId: varchar("source_id", { length: 50 }),
		congregationId: integer("congregation_id")
			.notNull()
			.references(() => congregations.id),
		deletedAt: timestamp("deleted_at"),
	},
	(t) => [
		index("mmfs_transaction_date_idx").on(t.transactionDate),
		index("mmfs_reference_idx").on(t.reference),
	],
);

export const mmfRelations = relations(mmf, ({ one }) => ({
	district: one(districts, {
		fields: [mmf.districtId],
		references: [districts.id],
	}),
	group: one(groups, {
		fields: [mmf.groupId],
		references: [groups.id],
	}),
	bank: one(ledgerAccounts, {
		fields: [mmf.bankId],
		references: [ledgerAccounts.id],
	}),
	subAccount: one(subAccounts, {
		fields: [mmf.subAccountId],
		references: [subAccounts.id],
	}),
	congregation: one(congregations, {
		fields: [mmf.congregationId],
		references: [congregations.id],
	}),
}));

export const pettyCashRelations = relations(pettyCash, ({ one }) => ({
	bank: one(ledgerAccounts, {
		fields: [pettyCash.bankId],
		references: [ledgerAccounts.id],
		relationName: "petty_cash_bank",
	}),
	congregation: one(congregations, {
		fields: [pettyCash.congregationId],
		references: [congregations.id],
	}),
}));

export const expensesHeaderRelations = relations(
	expensesHeader,
	({ one, many }) => ({
		group: one(groups, {
			fields: [expensesHeader.groupId],
			references: [groups.id],
		}),
		district: one(districts, {
			fields: [expensesHeader.districtId],
			references: [districts.id],
		}),
		bank: one(ledgerAccounts, {
			fields: [expensesHeader.bankId],
			references: [ledgerAccounts.id],
			relationName: "expenses_header_bank",
		}),
		creditingAccount: one(ledgerAccounts, {
			fields: [expensesHeader.creditingAccountId],
			references: [ledgerAccounts.id],
			relationName: "expenses_header_crediting_account",
		}),
		requisition: one(fundRequisitions, {
			fields: [expensesHeader.requisitionId],
			references: [fundRequisitions.id],
		}),
		congregation: one(congregations, {
			fields: [expensesHeader.congregationId],
			references: [congregations.id],
		}),
		details: many(expensesDetail),
	}),
);

export const expensesDetailRelations = relations(expensesDetail, ({ one }) => ({
	expense: one(expensesHeader, {
		fields: [expensesDetail.expenseId],
		references: [expensesHeader.id],
	}),
	account: one(ledgerAccounts, {
		fields: [expensesDetail.accountId],
		references: [ledgerAccounts.id],
		relationName: "expenses_detail_account",
	}),
}));

export const fundRequisitionsRelations = relations(
	fundRequisitions,
	({ one, many }) => ({
		district: one(districts, {
			fields: [fundRequisitions.districtId],
			references: [districts.id],
		}),
		group: one(groups, {
			fields: [fundRequisitions.groupId],
			references: [groups.id],
		}),
		requestedBy: one(users, {
			fields: [fundRequisitions.requestedBy],
			references: [users.id],
		}),
		approvedBy: one(users, {
			fields: [fundRequisitions.approvedBy],
			references: [users.id],
		}),
		congregation: one(congregations, {
			fields: [fundRequisitions.congregationId],
			references: [congregations.id],
		}),
		expensesHeaders: many(expensesHeader),
	}),
);

export const congregationsRelations = relations(congregations, ({ many }) => ({
	districts: many(districts),
	groups: many(groups),
	ledgerAccounts: many(ledgerAccounts),
	receiptHeaders: many(receiptHeader),
	services: many(services),
	users: many(users),
	churchRequisitionCategories: many(churchRequisitionCategories),
	expensesHeaders: many(expensesHeader),
	pettyCashEntries: many(pettyCash),
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
	expensesHeaders: many(expensesHeader),
}));

export const groupsRelations = relations(groups, ({ one, many }) => ({
	congregation: one(congregations, {
		fields: [groups.congregationId],
		references: [congregations.id],
	}),
	subAccounts: many(subAccounts),
	expensesHeaders: many(expensesHeader),
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
		expensesHeaderBanks: many(expensesHeader, {
			relationName: "expenses_header_bank",
		}),
		expensesHeaderCreditingAccounts: many(expensesHeader, {
			relationName: "expenses_header_crediting_account",
		}),
		pettyCashBanks: many(pettyCash, {
			relationName: "petty_cash_bank",
		}),
		expensesDetails: many(expensesDetail, {
			relationName: "expenses_detail_account",
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

import { relations } from "drizzle-orm";
import {
	boolean,
	date,
	index,
	integer,
	pgEnum,
	pgTable,
	serial,
	timestamp,
	uniqueIndex,
	varchar,
} from "drizzle-orm/pg-core";

export const USER_TYPES = ["super admin", "admin", "standard user"] as const;
export const userTypeEnum = pgEnum("user_type_enum", USER_TYPES);

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
		resetToken: varchar('reset_token'),
	},
	(table) => [
		uniqueIndex("users_user_id_congregation_unique").on(table.userId, table.congregationId),
		uniqueIndex("users_reset_token_unique").on(table.resetToken),
		index("users_district_id_idx").on(table.districtId),
		index("users_congregation_id_idx").on(table.congregationId),
		index("users_role_id_idx").on(table.roleId),
	],
);

export const congregationsRelations = relations(congregations, ({ many }) => ({
	districts: many(districts),
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

export const usersRelations = relations(users, ({ one }) => ({
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
}));

import type { LinkOptions } from "@tanstack/react-router";
import {
	BanknoteArrowDownIcon,
	BanknoteIcon,
	BriefcaseIcon,
	ChartNoAxesCombinedIcon,
	ChurchIcon,
	CircleGaugeIcon,
	CircleUserIcon,
	CreditCardIcon,
	FileSpreadsheetIcon,
	HandCoinsIcon,
	LandmarkIcon,
	ListTreeIcon,
	type LucideIcon,
	MapPinHouseIcon,
	NetworkIcon,
	ShieldCheckIcon,
	Users2Icon,
	WalletIcon,
} from "lucide-react";

export const SOURCES = [
	"Receipts",
	"Expenses",
	"Petty Cash",
	"Group Fund Approval",
	"Bank Transactions",
	"Payments",
	"Journal Entries",
	"Deposits",
	"Group Collections",
] as const;

export type Source = (typeof SOURCES)[number];

// type Route = keyof FileRoutesByPath;
export type Route = Pick<LinkOptions, "activeOptions" | "to">;

type MenuItem = {
	label: string;
	children: Array<{
		icon: LucideIcon;
		label: string;
		href: Route["to"];
		activeOptions?: Route["activeOptions"];
	}>;
};

export const DEFAULT_PAGE_INDEX = 0;
export const DEFAULT_PAGE_SIZE = 10;

export const MENU_ITEMS: Array<MenuItem> = [
	{
		label: "Admin",
		children: [
			{
				icon: CircleUserIcon,
				label: "Users",
				href: "/",
				activeOptions: { exact: false },
			},
			{
				icon: ShieldCheckIcon,
				label: "User Rights",
				href: "/",
				activeOptions: { exact: false },
			},
			{
				icon: ChurchIcon,
				label: "Congregation Info",
				href: "/",
				activeOptions: { exact: false },
			},
		],
	},
	{
		label: "Members",
		children: [
			{
				icon: MapPinHouseIcon,
				label: "Districts",
				href: "/",
				activeOptions: { exact: false },
			},
			{
				icon: Users2Icon,
				label: "Members",
				href: "/",
				activeOptions: { exact: false },
			},
			{
				icon: NetworkIcon,
				label: "Family",
				href: "/",
				activeOptions: { exact: false },
			},
		],
	},
	{
		label: "Finance",
		children: [
			{
				icon: CircleGaugeIcon,
				label: "Dashboard",
				href: "/finance/dashboard",
			},
			{
				icon: ListTreeIcon,
				label: "Chart Of Accounts",
				href: "/finance/chart-of-accounts",
				activeOptions: { exact: false },
			},
			{
				icon: HandCoinsIcon,
				label: "Receipts",
				href: "/finance/receipts",
				activeOptions: { exact: false },
			},
			{
				icon: BanknoteIcon,
				label: "Funds Requisitions",
				href: "/finance/fund-requisitions",
				activeOptions: { exact: false },
			},
			{
				icon: BanknoteArrowDownIcon,
				label: "Expenses",
				href: "/finance/expenses",
				activeOptions: { exact: false },
			},
			{
				icon: WalletIcon,
				label: "Petty Cash",
				href: "/finance/petty-cash",
				activeOptions: { exact: false },
			},
			{
				icon: BriefcaseIcon,
				label: "Budgets",
				href: "/",
			},
			{
				icon: FileSpreadsheetIcon,
				label: "Journal Entries",
				href: "/",
			},
			{
				icon: LandmarkIcon,
				label: "Bank Transactions",
				href: "/",
			},
			{
				icon: CreditCardIcon,
				label: "Payments",
				href: "/",
			},
			{
				icon: ChartNoAxesCombinedIcon,
				label: "Cashflow Statement",
				href: "/",
			},
		],
	},
];

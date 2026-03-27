import { queryOptions } from "@tanstack/react-query";
import { getAccounts } from "#/features/coa/services/coa.api";
import type { CoaValidateSearch } from "#/features/coa/utils/schemas";
import { toTitleCase } from "#/lib/utils";


export const accountQueries = {
    all: ["accounts"] as const,
    list: (filters: CoaValidateSearch) =>
        queryOptions({
            queryKey: [...accountQueries.all, "list", filters],
            queryFn: () => getAccounts({ data: filters }),
        }),
    parentAccounts: () =>
        queryOptions({
            queryKey: [...accountQueries.all, "parent-accounts"],
            queryFn: async () => {
                const accounts = await getAccounts({ data: {} });
                return accounts
                    .filter((account) => !account.parentId && account.active)
                    .map((acc) => ({
                        value: acc.id,
                        label: toTitleCase(acc.name),
                        type: acc.accountType,
                    }));
            },
        }),
    // detail: (accountId: number) =>
    // 	queryOptions({
    // 		queryKey: [...accountQueries.all, "detail", accountId],
    // 		queryFn: () => getAccount({ data: accountId }),
    // 	}),
    // activeAccounts: () =>
    // 	queryOptions({
    // 		queryKey: [...accountQueries.all, "active-accounts"],
    // 		queryFn: async () => {
    // 			const accounts = await getAccounts({ data: {} });
    // 			return accounts
    // 				.filter((account) => account.isActive)
    // 				.map(({ id, name }) => ({
    // 					value: id.toString(),
    // 					label: toTitleCase(name),
    // 				}));
    // 		},
    // 	}),
    // activeChildAccountsByAccountType: (accountType: AccountType) =>
    // 	queryOptions({
    // 		queryKey: [...accountQueries.all, "active-accounts", accountType],
    // 		queryFn: async () => {
    // 			const accounts = await getAccounts({ data: {} });
    // 			return accounts
    // 				.filter(
    // 					(account) =>
    // 						account.parentId &&
    // 						account.isActive &&
    // 						account.type === accountType,
    // 				)
    // 				.map(({ id, name }) => ({
    // 					value: id.toString(),
    // 					label: toTitleCase(name),
    // 				}));
    // 		},
    // 	}),
    // childrenAccountsByParentName: (parentName: string) =>
    // 	queryOptions({
    // 		queryKey: [...accountQueries.all, "children-accounts", parentName],
    // 		queryFn: () => getChildrenAccountByParentName({ data: parentName }),
    // 	}),
};
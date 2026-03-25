import { type ToOptions, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect } from "react";
import {
	type SheetOptions,
	useSheet,
} from "#/integrations/providers/sheet-provider";

type SheetMode = "new" | "edit";

type SheetConfig<TSearch> = {
	// title: string | ((search: TSearch) => string);
	// description?: string | ((search: TSearch) => string | undefined);
	options?: Omit<SheetOptions, "onOpenChange">;
	render: (args: {
		search: TSearch;
		closeSheet: () => void;
	}) => React.ReactNode;
};

type UseOpenSheetProps<TSearch> = {
	from: ToOptions["from"];
	search: TSearch & {
		sheet?: SheetMode;
	};
	configs: Partial<Record<SheetMode, SheetConfig<TSearch>>>;
};

export function useOpenSheet<TSearch>({
	from,
	search,
	configs,
}: UseOpenSheetProps<TSearch>) {
	const navigate = useNavigate({ from });
	const { setOpen, setClose } = useSheet();

	const closeSheet = useCallback(() => {
		// navigate({ search: {} });
		navigate({
			search: (prev) => {
				const { sheet, ...rest } = prev as TSearch & { sheet?: SheetMode };
				return rest;
			},
		});
	}, [navigate]);

	useEffect(() => {
		const mode = search.sheet;

		if (!mode) {
			setClose();
			return;
		}

		const config = configs[mode];

		if (!config) {
			setClose();
			return;
		}

		const title = config.options?.title;

		const description = config.options?.description;

		setOpen(config.render({ search, closeSheet }), {
			title,
			description,
			onOpenChange: (open) => {
				if (!open) closeSheet();
			},
			className: config.options?.className || "max-w-2xl!",
		});

		return () => {
			setClose();
		};
	}, [search, configs, setOpen, setClose, closeSheet]);
}

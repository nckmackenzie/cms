import { useStore } from "@tanstack/react-form";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getRouteApi, type RouteApi } from "@tanstack/react-router";
import {
	CheckIcon,
	MinusIcon,
	PlusIcon,
	RefreshCcw,
	SearchIcon,
	TrashIcon,
	Undo2Icon,
} from "lucide-react";
import { nanoid } from "nanoid";
import { useEffect, useMemo } from "react";
import { ActionButton } from "#/components/ui/action-button";
import { Button } from "#/components/ui/button";
import { ButtonGroup } from "#/components/ui/button-group";
import { Field, FieldGroup } from "#/components/ui/field";
import { LoadingSwap } from "#/components/ui/loading-swap";
import { PageHeader } from "#/components/ui/page-header";
import {
	Table,
	TableBody,
	TableCell,
	TableFooter,
	TableHead,
	TableHeader,
	TableRow,
} from "#/components/ui/table";
import { JournalSearch } from "#/features/journal-entries/components/journal-search";
import {
	deleteJournalEntry,
	upsertJournalEntries,
} from "#/features/journal-entries/services/journal-entries.api";
import { journalQueries } from "#/features/journal-entries/services/queries";
import {
	type JournalEntry,
	journalEntrySchema,
} from "#/features/journal-entries/utils/schemas";
import { useAppForm } from "#/hooks/form";
import { useFilters } from "#/hooks/use-filters";
import { useFormUpsert } from "#/hooks/use-form-upsert";
import { useSheet } from "#/integrations/providers/sheet-provider";
import { currencyFormatter, dateFormat } from "#/lib/helpers";

export function JournalEntriesPage() {
	const route = getRouteApi("/(authed)/finance/journal-entries/");
	const { setOpen } = useSheet();
	return (
		<div className="y-spacing">
			<PageHeader
				title="Journal Entry"
				description="Create a new journal entry"
				content={
					<Button
						variant="secondary"
						onClick={() =>
							setOpen(<JournalSearch />, {
								side: "right",
								className: "w-full sm:max-w-4xl!",
							})
						}
					>
						<SearchIcon />
						Search journal
					</Button>
				}
			/>
			<EntriesForm route={route} />
		</div>
	);
}

type EntriesFormProps = {
	route: RouteApi<"/(authed)/finance/journal-entries/">;
};

function EntriesForm({ route }: EntriesFormProps) {
	const queryClient = useQueryClient();
	const { resetFilters, filters } = useFilters(route.id);
	const {
		accounts,
		journalNo: loaderJournalNo,
		allAccounts,
		currentFiscalYear,
	} = route.useLoaderData();
	const { data: freshJournalNo } = useQuery(
		journalQueries.journalNo(currentFiscalYear.startDate),
	);
	const { data: loadedJournal, isLoading } = useQuery({
		...journalQueries.journal(filters.public_id ?? ""),
		enabled: !!filters.public_id,
	});
	const journalNo = freshJournalNo ?? loaderJournalNo;
	const emptyJournal = useMemo<JournalEntry>(
		() => ({
			journalLines: [],
			date: dateFormat(new Date()),
			journalNo,
		}),
		[journalNo],
	);
	const ledgerAccounts = filters.public_id
		? allAccounts.map(({ publicId, name }) => ({
				value: publicId,
				label: name,
			}))
		: accounts;

	const { mutate, isPending } = useFormUpsert({
		upsertFn: (data: JournalEntry) => upsertJournalEntries({ data }),
		entityName: "Journal entry",
		queryKey: ["journal"],
	});

	const form = useAppForm({
		defaultValues: loadedJournal ?? emptyJournal,
		validators: {
			onSubmit: journalEntrySchema,
		},
		onSubmit: ({ value }) => {
			mutate(
				{ ...value, id: loadedJournal?.id },
				{
					onSuccess: (result) => {
						if (!result.success) return;
						handleReset();
						if (loadedJournal) {
							queryClient.invalidateQueries({
								queryKey: ["journal", "detail", loadedJournal.id],
							});
						}
					},
				},
			);
		},
	});
	const [journalLines, entryDate] = useStore(form.store, (state) => [
		state.values.journalLines,
		state.values.date,
	]);

	useEffect(() => {
		if (!loadedJournal) return;
		form.reset(loadedJournal);
	}, [loadedJournal, form]);

	useEffect(() => {
		if (filters.public_id || !entryDate) return;
		let ignore = false;
		queryClient.fetchQuery(journalQueries.journalNo(entryDate)).then((data) => {
			if (!ignore) {
				form.setFieldValue("journalNo", data);
			}
		});
		return () => {
			ignore = true;
		};
	}, [entryDate, filters.public_id, form, queryClient]);

	const { totalDebits, totalCredits } = journalLines.reduce(
		(acc, line) => {
			acc.totalDebits += line.debit || 0;
			acc.totalCredits += line.credit || 0;
			return acc;
		},
		{ totalDebits: 0, totalCredits: 0 },
	);

	async function handleDelete(journal: JournalEntry) {
		const res = await deleteJournalEntry({
			data: { publicId: journal.id ?? "" },
		});
		if (res.success) {
			form.reset(emptyJournal);
			resetFilters();
			queryClient.invalidateQueries({ queryKey: ["journal"] });
		}
		return res;
	}

	if (filters.public_id && !loadedJournal && !isLoading) {
		return (
			<JournalNotFound publicId={filters.public_id} onClear={handleReset} />
		);
	}

	function handleReset() {
		form.reset(emptyJournal);
		resetFilters();
	}

	return (
		<form
			onSubmit={(e) => {
				e.preventDefault();
				form.handleSubmit();
			}}
			className="space-y-4"
		>
			<FieldGroup className="grid md:grid-cols-2 max-w-2xl rounded-md bg-card p-4">
				<form.AppField name="date">
					{(field) => <field.TextField type="date" label="Date" required />}
				</form.AppField>
				<form.AppField name="journalNo">
					{(field) => (
						<field.TextField
							readOnly
							type="number"
							label="Journal No"
							required
						/>
					)}
				</form.AppField>
			</FieldGroup>
			<section className="rounded-md bg-card p-4 shadow-sm">
				<form.Field name="journalLines" mode="array">
					{(field) => (
						<div className="space-y-4">
							<div className="flex md:items-center md:justify-end md:flex-row flex-col gap-4">
								<ButtonGroup>
									<Button
										type="button"
										variant="secondary"
										onClick={() =>
											field.pushValue({
												accountId: "",
												debit: 0,
												credit: 0,
												description: null,
												id: nanoid(),
											})
										}
									>
										<PlusIcon className="size-4" aria-hidden="true" />
										Add Line
									</Button>
									<Button
										type="button"
										variant="ghost"
										disabled={field.state.value.length === 0}
										onClick={() => field.clearValues()}
										className="bg-destructive/10 text-destructive hover:bg-destructive/40"
									>
										<MinusIcon className="size-4" aria-hidden="true" />
										Clear Lines
									</Button>
								</ButtonGroup>
							</div>
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead className="w-[300px]">Account</TableHead>
										<TableHead className="w-[180px]">Debit</TableHead>
										<TableHead className="w-[180px]">Credit</TableHead>
										<TableHead>Description</TableHead>
										<TableHead className="w-24"></TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{field.state.value.map((line, index) => (
										<TableRow key={line.id}>
											<TableCell>
												<form.AppField
													name={`journalLines[${index}].accountId`}
												>
													{(field) => (
														<field.Select label="" values={ledgerAccounts} />
													)}
												</form.AppField>
											</TableCell>
											<TableCell>
												<form.AppField name={`journalLines[${index}].debit`}>
													{(field) => (
														<field.TextField
															type="number"
															value={
																field.state.value === 0 ? "" : field.state.value
															}
															label=""
														/>
													)}
												</form.AppField>
											</TableCell>
											<TableCell>
												<form.AppField name={`journalLines[${index}].credit`}>
													{(field) => (
														<field.TextField
															type="number"
															value={
																field.state.value === 0 ? "" : field.state.value
															}
															label=""
														/>
													)}
												</form.AppField>
											</TableCell>
											<TableCell>
												<form.AppField
													name={`journalLines[${index}].description`}
												>
													{(field) => <field.TextField type="text" label="" />}
												</form.AppField>
											</TableCell>
											<TableCell>
												<Button
													type="button"
													variant="ghost"
													onClick={() => field.removeValue(index)}
												>
													<TrashIcon
														className="size-4 text-destructive"
														aria-hidden="true"
													/>
												</Button>
											</TableCell>
										</TableRow>
									))}
								</TableBody>
								{journalLines.length > 0 && (
									<TableFooter>
										<TableRow>
											<TableCell className="text-right font-bold">
												Total
											</TableCell>
											<TableCell className="text-right font-bold">
												{currencyFormatter(totalDebits, false)}
											</TableCell>
											<TableCell className="text-right font-bold">
												{currencyFormatter(totalCredits, false)}
											</TableCell>
											<TableCell colSpan={2}></TableCell>
										</TableRow>
									</TableFooter>
								)}
							</Table>
						</div>
					)}
				</form.Field>
			</section>
			<form.Subscribe selector={(state) => [state.isSubmitting]}>
				{([isSubmitting]) => (
					<Field orientation={"horizontal"} className="justify-end">
						<Button
							type="submit"
							disabled={isSubmitting || isPending}
							size="xl"
						>
							<LoadingSwap
								className="flex flex-row items-center gap-2"
								isLoading={isSubmitting || isPending}
							>
								<CheckIcon />
								{loadedJournal ? "Update" : "Submit"}
							</LoadingSwap>
						</Button>
						<Button
							type="button"
							disabled={isSubmitting}
							variant="outline"
							size="xl"
							onClick={handleReset}
						>
							<Undo2Icon className="size-4" aria-hidden="true" />
							Cancel
						</Button>
						{loadedJournal && (
							<ActionButton
								requireAreYouSure
								isDestructive
								action={() => handleDelete(loadedJournal)}
								variant="destructive"
								size="xl"
							>
								<TrashIcon className="size-4" aria-hidden="true" />
								Delete
							</ActionButton>
						)}
					</Field>
				)}
			</form.Subscribe>
		</form>
	);
}

type JournalNotFoundProps = {
	publicId: string;
	onClear: () => void;
};

function JournalNotFound({ publicId, onClear }: JournalNotFoundProps) {
	return (
		<div className="flex flex-col items-center justify-center p-8 text-center border border-dashed rounded-lg bg-card min-h-[300px] animate-in fade-in duration-300">
			<div className="flex items-center justify-center size-12 rounded-full bg-muted mb-4">
				<SearchIcon className="size-6 text-muted-foreground" />
			</div>
			<h3 className="text-lg font-semibold tracking-tight text-foreground mb-1">
				Journal Not Found
			</h3>
			<p className="text-sm text-muted-foreground max-w-xs mb-6">
				No journal entry could be found for the selected record{" "}
				<span className="font-semibold text-foreground">{publicId}</span>.
			</p>
			<Button onClick={onClear} variant="outline" size="sm">
				<RefreshCcw className="mr-2 size-4" />
				Reset Filters
			</Button>
		</div>
	);
}

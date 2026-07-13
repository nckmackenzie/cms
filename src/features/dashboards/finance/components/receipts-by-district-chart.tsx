import { useSuspenseQuery } from "@tanstack/react-query";
import {
	Bar,
	BarChart,
	CartesianGrid,
	LabelList,
	XAxis,
	YAxis,
} from "recharts";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "#/components/ui/card";
import {
	type ChartConfig,
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
} from "#/components/ui/chart";
import { EmptyState } from "#/components/ui/empty";
import { Skeleton } from "#/components/ui/skeleton";
import { currencyFormatter } from "#/lib/helpers";
import type { FinanceDashboardValidateSearch } from "../lib/schemas";
import { financeDashboardQueries } from "../services/queries";

const chartConfig = {
	amount: {
		label: "Receipts",
		color: "var(--chart-1)",
	},
} satisfies ChartConfig;

export function FinanceReceiptsByDistrictChart({
	filters,
}: {
	filters: FinanceDashboardValidateSearch;
}) {
	const { data: rawData } = useSuspenseQuery(
		financeDashboardQueries.receiptsByDistrict(filters),
	);
	const data = rawData.map((item) => ({
		...item,
		districtName: item.districtName.toUpperCase(),
	}));

	return (
		<Card className="bg-white">
			<CardHeader>
				<CardTitle>Receipts Breakdown by District</CardTitle>
				<CardDescription>
					Total contributions received per district for the selected financial
					year
				</CardDescription>
			</CardHeader>
			<CardContent>
				{data.length === 0 ? (
					<EmptyState
						title="No district receipts yet"
						description="Receipts posted against a district will appear here."
					/>
				) : (
					<ChartContainer
						config={chartConfig}
						className="aspect-auto w-full"
						style={{ height: Math.max(220, data.length * 48) }}
					>
						<BarChart
							accessibilityLayer
							data={data}
							layout="vertical"
							margin={{ left: 0, right: 32 }}
						>
							<CartesianGrid horizontal={false} />
							<YAxis
								dataKey="districtName"
								type="category"
								tickLine={false}
								axisLine={false}
								width={110}
							/>
							<XAxis
								type="number"
								hide
								domain={[0, (dataMax: number) => dataMax * 1.2]}
							/>
							<ChartTooltip
								cursor={false}
								content={
									<ChartTooltipContent
										hideLabel
										formatter={(value) => currencyFormatter(Number(value))}
									/>
								}
							/>
							<Bar dataKey="amount" fill="var(--color-amount)" radius={4}>
								<LabelList
									dataKey="amount"
									position="right"
									className="fill-foreground"
									fontSize={12}
									formatter={(value: number) =>
										currencyFormatter(value, true, true)
									}
								/>
							</Bar>
						</BarChart>
					</ChartContainer>
				)}
			</CardContent>
		</Card>
	);
}

export function FinanceReceiptsByDistrictChartSkeleton() {
	return (
		<Card>
			<CardHeader>
				<Skeleton className="h-5 w-64" />
				<Skeleton className="h-4 w-80" />
			</CardHeader>
			<CardContent className="space-y-3">
				{Array.from({ length: 4 }).map((_, index) => (
					<Skeleton key={index} className="h-9 w-full" />
				))}
			</CardContent>
		</Card>
	);
}

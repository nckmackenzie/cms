export type BudgetProgressVariant = "danger" | "warning" | "success";

/**
 * Red when over half the budget is spent, yellow between 25-50%,
 * green below 25% — thresholds as specified for the budget vs actual widget.
 */
export function getBudgetProgressVariant(
	percentageSpent: number,
): BudgetProgressVariant {
	if (percentageSpent > 50) return "danger";
	if (percentageSpent >= 25) return "warning";
	return "success";
}

export function getProgressBarValue(percentageSpent: number): number {
	if (!Number.isFinite(percentageSpent)) return 0;
	return Math.min(100, Math.max(0, percentageSpent));
}

const ACCOUNTABILITY_TOLERANCE = 0.01;

/**
 * A requisition is fully accounted for once its approved amount equals the
 * sum of expenses posted against it, within a cent of rounding tolerance.
 */
export function getAccountabilityVariance(
	approvedAmount: number,
	accountedAmount: number,
): number {
	return approvedAmount - accountedAmount;
}

export function isFullyAccounted(
	approvedAmount: number,
	accountedAmount: number,
): boolean {
	return (
		Math.abs(getAccountabilityVariance(approvedAmount, accountedAmount)) <=
		ACCOUNTABILITY_TOLERANCE
	);
}

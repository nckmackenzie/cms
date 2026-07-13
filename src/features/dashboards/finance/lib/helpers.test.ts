import { describe, expect, it } from "vitest";
import {
	getAccountabilityVariance,
	getBudgetProgressVariant,
	getProgressBarValue,
	isFullyAccounted,
} from "./helpers";

describe("getBudgetProgressVariant", () => {
	it("returns danger when spend is over 50%", () => {
		expect(getBudgetProgressVariant(51)).toBe("danger");
		expect(getBudgetProgressVariant(114)).toBe("danger");
	});

	it("returns warning between 25% and 50% inclusive", () => {
		expect(getBudgetProgressVariant(50)).toBe("warning");
		expect(getBudgetProgressVariant(25)).toBe("warning");
		expect(getBudgetProgressVariant(37.5)).toBe("warning");
	});

	it("returns success when spend is under 25%", () => {
		expect(getBudgetProgressVariant(24.99)).toBe("success");
		expect(getBudgetProgressVariant(0)).toBe("success");
	});
});

describe("getProgressBarValue", () => {
	it("caps values above 100 to 100", () => {
		expect(getProgressBarValue(114)).toBe(100);
	});

	it("floors negative values to 0", () => {
		expect(getProgressBarValue(-10)).toBe(0);
	});

	it("returns 0 for non-finite input", () => {
		expect(getProgressBarValue(Number.NaN)).toBe(0);
		expect(getProgressBarValue(Number.POSITIVE_INFINITY)).toBe(0);
	});

	it("passes through in-range values unchanged", () => {
		expect(getProgressBarValue(42)).toBe(42);
	});
});

describe("getAccountabilityVariance", () => {
	it("returns a positive variance when the requisition is under-accounted", () => {
		expect(getAccountabilityVariance(40000, 25000)).toBe(15000);
	});

	it("returns a negative variance when the requisition is over-accounted", () => {
		expect(getAccountabilityVariance(40000, 45000)).toBe(-5000);
	});

	it("returns zero when fully accounted for", () => {
		expect(getAccountabilityVariance(40000, 40000)).toBe(0);
	});
});

describe("isFullyAccounted", () => {
	it("returns true when approved and accounted amounts match exactly", () => {
		expect(isFullyAccounted(40000, 40000)).toBe(true);
	});

	it("tolerates sub-cent rounding differences", () => {
		expect(isFullyAccounted(40000, 40000.005)).toBe(true);
	});

	it("returns false when under-accounted", () => {
		expect(isFullyAccounted(40000, 25000)).toBe(false);
	});

	it("returns false when over-accounted", () => {
		expect(isFullyAccounted(40000, 45000)).toBe(false);
	});
});

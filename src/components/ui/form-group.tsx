import type { PropsWithChildren } from "react";
import { cn } from "#/lib/utils";
import { Field, FieldLabel } from "./field";
import { Input } from "./input";

export function FormGroup({
	className,
	children,
}: PropsWithChildren<{ className?: string }>) {
	return <div className={cn("grid gap-2", className)}>{children}</div>;
}

type FormGroupWithLabelInputProps = {
	labelName: string;
	className?: string;
	labelClassName?: string;
	inputProps: React.ComponentProps<"input">;
};

export function FormGroupWithLabelInput({
	className,
	labelName,
	labelClassName,
	inputProps,
}: FormGroupWithLabelInputProps) {
	return (
		<Field className={cn(className)}>
			<FieldLabel className={cn(labelClassName)}>{labelName}</FieldLabel>
			<Input {...inputProps} />
		</Field>
	);
}

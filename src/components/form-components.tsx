import type { VariantProps } from "class-variance-authority";
import {SaveIcon, XIcon } from "lucide-react";
import type { ComponentProps } from "react";
import { Button, type buttonVariants } from "#/components/ui/button";
import { ComboBox } from "#/components/ui/custom-select";
import {
	Field,
	FieldContent,
	FieldDescription,
	FieldError,
	FieldLabel,
} from "#/components/ui/field";
import { Input } from "#/components/ui/input";
import { LoadingSwap } from "#/components/ui/loading-swap";
import * as ShadcnSelect from "#/components/ui/select";
import { Slider as ShadcnSlider } from "#/components/ui/slider";
import { Switch as ShadcnSwitch } from "#/components/ui/switch";
import { Textarea } from "#/components/ui/textarea";
import { useFieldContext, useFormContext } from "#/hooks/form-context";
import { useIsMobile } from "#/hooks/use-mobile";
import { cn } from "#/lib/utils";
import { Checkbox } from "./ui/checkbox";
import { PasswordInput } from "./ui/password-input";

type UniversalFieldProps = {
	fieldClassName?: string;
	helperText?: string;
};

type SubmitButtonProps = {
	buttonText: string;
	disabled?: boolean;
	isLoading?: boolean;
	orientation?: "horizontal" | "vertical";
	withReset?: boolean;
	onReset?: () => void;
	buttonSize?: VariantProps<typeof buttonVariants>["size"];
	icon?: React.ReactNode;
	cancelIcon?: React.ReactNode;
	fieldClassName?: string;
	cancelButtonText?: string;
	children?: React.ReactNode;
	className?: string;
};

export function SubmitButton({
	buttonText,
	className,
	cancelButtonText,
	disabled,
	isLoading,
	orientation,
	withReset,
	onReset,
	buttonSize,
	icon,
	fieldClassName,
	cancelIcon,
}: SubmitButtonProps) {
	const form = useFormContext();
	const isMobile = useIsMobile();

	return (
		<form.Subscribe selector={(state) => state.isSubmitting}>
			{(isSubmitting) => (
				<Field
					orientation={isMobile ? "vertical" : orientation || "horizontal"}
					className={fieldClassName}
				>
					<Button
						type="submit"
						className={cn("flex", className)}
						disabled={isSubmitting || disabled || isLoading}
						size={buttonSize ?? "xl"}
					>
						<LoadingSwap
							isLoading={isSubmitting || !!isLoading}
							className="flex gap-2 items-center"
						>
							{icon || <SaveIcon />}
							{buttonText}
						</LoadingSwap>
					</Button>
					{withReset && (
						<Button
							type="button"
							disabled={isSubmitting}
							variant="outline"
							size={buttonSize ?? "xl"}
							onClick={onReset ? () => onReset() : () => form.reset()}
						>
							{cancelIcon || <XIcon />}
							{cancelButtonText || "Cancel"}
						</Button>
					)}
				</Field>
			)}
		</form.Subscribe>
	);
}

type TextFieldProps = {
	label?: string;
} & ComponentProps<typeof Input> &
	UniversalFieldProps;

export function TextField({
	label,
	fieldClassName,
	helperText,
	...props
}: TextFieldProps) {
	const field = useFieldContext();
	const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

	const isNumber = props.type === "number";

	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const rawValue = e.target.value;
		const value = isNumber ? +rawValue : rawValue === "" ? null : rawValue;
		field.handleChange(value);
	};

	return (
		<Field data-invalid={isInvalid} className={fieldClassName}>
			{label && <FieldLabel htmlFor={field.name}>{label}</FieldLabel>}
			<Input
				value={field.state.value as string}
				onBlur={field.handleBlur}
				id={field.name}
				aria-invalid={isInvalid}
				onChange={handleChange}
				className={cn("h-10!", props.className)}
				{...props}
			/>
			{helperText && <FieldDescription>{helperText}</FieldDescription>}
			{isInvalid && <FieldError errors={field.state.meta.errors} />}
		</Field>
	);
}

export function PasswordTextField({
	label,
	fieldClassName,
	helperText,
	...props
}: TextFieldProps) {
	const field = useFieldContext();
	const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

	const isNumber = props.type === "number";

	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const rawValue = e.target.value;
		const value = isNumber ? +rawValue : rawValue === "" ? null : rawValue;
		field.handleChange(value);
	};

	return (
		<Field data-invalid={isInvalid} className={fieldClassName}>
			{label && <FieldLabel htmlFor={field.name}>{label}</FieldLabel>}
			<PasswordInput
				value={field.state.value as string}
				onBlur={field.handleBlur}
				id={field.name}
				aria-invalid={isInvalid}
				onChange={handleChange}
				className={cn("h-10!", props.className)}
				{...props}
			/>
			{helperText && <FieldDescription>{helperText}</FieldDescription>}
			{isInvalid && <FieldError errors={field.state.meta.errors} />}
		</Field>
	);
}

type TextAreaProps = {
	label?: string;
} & ComponentProps<typeof Textarea> &
	UniversalFieldProps;

export function TextArea({
	label,
	fieldClassName,
	helperText,
	...props
}: TextAreaProps) {
	const field = useFieldContext<string>();
	const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

	return (
		<Field data-invalid={isInvalid} className={fieldClassName}>
			<FieldLabel htmlFor={field.name}>{label}</FieldLabel>
			<Textarea
				value={field.state.value}
				onBlur={field.handleBlur}
				onChange={(e) => field.handleChange(e.target.value)}
				id={field.name}
				aria-invalid={isInvalid}
				className={cn("field-sizing-content min-h-auto", props.className)}
				{...props}
			/>
			{helperText && <FieldDescription>{helperText}</FieldDescription>}
			{isInvalid && <FieldError errors={field.state.meta.errors} />}
		</Field>
	);
}

type SelectProps = {
	label?: string;
	values: Array<{ label: string; value: string }>;
	placeholder?: string;
	className?: string;
	disabled?: boolean;
	isNumber?: boolean;
} & ComponentProps<typeof ShadcnSelect.Select> &
	UniversalFieldProps;

export function Select({
	label,
	values,
	placeholder,
	fieldClassName,
	helperText,
	className,
	disabled,
	isNumber,
}: SelectProps) {
	const field = useFieldContext<string | number | null | undefined>();
	const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

	return (
		<Field data-invalid={isInvalid} className={fieldClassName}>
			{label && <FieldLabel htmlFor={field.name}>{label}</FieldLabel>}
			<ShadcnSelect.Select
				onValueChange={(e) => field.handleChange(isNumber ? Number(e) : e)}
				value={field.state.value?.toString() || ""}
			>
				<ShadcnSelect.SelectTrigger
					aria-invalid={isInvalid}
					id={field.name}
					onBlur={field.handleBlur}
					className={cn("h-10!", className)}
					disabled={disabled}
				>
					<ShadcnSelect.SelectValue
						placeholder={placeholder ?? "Select an option"}
					/>
				</ShadcnSelect.SelectTrigger>
				<ShadcnSelect.SelectContent>
					{values.map((value) => (
						<ShadcnSelect.SelectItem key={value.value} value={value.value}>
							{value.label}
						</ShadcnSelect.SelectItem>
					))}
				</ShadcnSelect.SelectContent>
			</ShadcnSelect.Select>
			{helperText && <FieldDescription>{helperText}</FieldDescription>}
			{isInvalid && <FieldError errors={field.state.meta.errors} />}
		</Field>
	);
}

export function Slider({
	label,
	fieldClassName,
}: { label: string } & UniversalFieldProps) {
	const field = useFieldContext<number>();
	const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

	return (
		<Field data-invalid={isInvalid} className={fieldClassName}>
			<FieldLabel htmlFor={field.name}>{label}</FieldLabel>
			<ShadcnSlider
				id={field.name}
				onBlur={field.handleBlur}
				value={[field.state.value]}
				onValueChange={(value) => field.handleChange(value[0])}
				aria-invalid={isInvalid}
			/>
			{isInvalid && <FieldError errors={field.state.meta.errors} />}
		</Field>
	);
}

export function Switch({
	label,
	fieldClassName,
}: { label: string } & UniversalFieldProps) {
	const field = useFieldContext<boolean>();
	const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

	return (
		<Field data-invalid={isInvalid} className={fieldClassName}>
			<div className="flex items-center gap-2">
				<ShadcnSwitch
					id={field.name}
					onBlur={field.handleBlur}
					checked={field.state.value}
					onCheckedChange={(checked) => field.handleChange(checked)}
					aria-invalid={isInvalid}
				/>
				<FieldLabel htmlFor={field.name}>{label}</FieldLabel>
			</div>
			{isInvalid && <FieldError errors={field.state.meta.errors} />}
		</Field>
	);
}

export function FormCheckbox({
	fieldClassName,
	label,
	helperText,
}: {
	fieldClassName?: string;
	label?: string;
	helperText?: string;
} & UniversalFieldProps) {
	const field = useFieldContext<boolean>();
	const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
	return (
		<Field
			data-invalid={isInvalid}
			className={fieldClassName}
			orientation="horizontal"
		>
			<Checkbox
				id={field.name}
				name={field.name}
				checked={field.state.value}
				onBlur={field.handleBlur}
				onCheckedChange={(e) => field.handleChange(e === true)}
				aria-invalid={isInvalid}
			/>

			<FieldContent>
				<FieldLabel htmlFor={field.name}>{label}</FieldLabel>
				{helperText && <FieldDescription>{helperText}</FieldDescription>}
				{isInvalid && <FieldError errors={field.state.meta.errors} />}
			</FieldContent>
		</Field>
	);
}

type ComboboxFieldProps = {
	label?: string;
	placeholder: string;
	className?: string;
	items: Array<{ value: string; label: string }>;
	addNew?: React.ReactNode;
	disabled?: boolean;
} & UniversalFieldProps;

export function ComboboxField({
	label,
	placeholder,
	helperText,
	className,
	items,
	addNew,
	disabled,
}: ComboboxFieldProps) {
	const field = useFieldContext<string>();
	const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

	return (
		<Field data-invalid={isInvalid} className={className}>
			{label && <FieldLabel htmlFor={field.name}>{label}</FieldLabel>}
			<ComboBox
				value={field.state.value}
				onChange={(value) => field.handleChange(value)}
				aria-invalid={isInvalid}
				placeholder={placeholder}
				items={items}
				isInvalid={isInvalid}
				addNew={addNew}
				disabled={disabled}
			/>
			{helperText && <FieldDescription>{helperText}</FieldDescription>}
			{isInvalid && <FieldError errors={field.state.meta.errors} />}
		</Field>
	);
}

import { CheckIcon, MoreVerticalIcon, PrinterIcon } from "lucide-react";

export function MoreButton() {
	return (
		<button type="button" aria-label="More options">
			<MoreVerticalIcon className="size-4 text-muted-foreground" />
		</button>
	);
}

export function CheckButton({ text }: { text: string }) {
	return (
		<>
			<CheckIcon className="size-4! text-muted-foreground" />
			<span className="text-xs -ml-1">{text}</span>
		</>
	);
}

export function EditAction() {
	return (
		<>
			{/* <PencilIcon className="size-4! text-muted-foreground" /> */}
			<span className="text-xs">Edit</span>
		</>
	);
}

export function PrintAction() {
	return (
		<>
			<PrinterIcon className="size-4! text-muted-foreground" />
			<span className="text-xs">Print</span>
		</>
	);
}

export function ViewDetailsAction({ text }: { text?: string }) {
	return (
		<>
			{/* <FileSpreadsheetIcon className="size-4! text-muted-foreground" /> */}
			<span className="text-xs">{text || "Details"}</span>
		</>
	);
}

export function AutomateAction({ text }: { text: string }) {
	return (
		<>
			{/* <SparkleIcon className="size-4! text-muted-foreground" /> */}
			<span className="text-xs">{text}</span>
		</>
	);
}

export function DeleteAction() {
	return (
		<div className="flex items-center gap-1">
			{/* <TrashIcon className="size-4! text-destructive" /> */}
			<span className="text-destructive text-xs">Delete</span>
		</div>
	);
}

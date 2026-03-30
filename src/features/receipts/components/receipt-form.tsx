import { FieldGroup } from "#/components/ui/field";
import { useAppForm } from "#/hooks/form";
import type { OnSuccess } from "@/lib/helpers";

type ReceiptFormProps = OnSuccess & {
	receiptId?: string;
};

export function ReceiptsForm({ receiptId, onSuccess }: ReceiptFormProps) {
	const form = useAppForm({
		defaultValues: {},
	});

	return (
		<div className="max-w-5xl mx-auto ">
			<form
				onSubmit={(e) => {
					e.preventDefault();
					e.stopPropagation();
					form.handleSubmit();
				}}
			>
				<FieldGroup>
					<form.AppForm>
						<form.SubmitButton
							fieldClassName="justify-end"
							buttonText={receiptId ? "Update Receipts" : "Save Receipts"}
							cancelButtonText="Cancel"
							withReset
						/>
					</form.AppForm>
				</FieldGroup>
				<FieldGroup className="bg-card"></FieldGroup>
			</form>
		</div>
	);
}

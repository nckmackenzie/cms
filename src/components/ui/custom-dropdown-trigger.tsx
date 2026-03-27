import { MoreVerticalIcon } from "lucide-react";
import { DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export function CustomDropdownTrigger() {
	return (
		<DropdownMenuTrigger asChild>
			<button
				type="button"
				aria-label="More options"
				className="border-none outline-none cursor-pointer"
			>
				<MoreVerticalIcon className="size-4 text-muted-foreground" />
			</button>
		</DropdownMenuTrigger>
	);
}

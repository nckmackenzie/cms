import {
	createContext,
	type ReactNode,
	useContext,
	useEffect,
	useState,
} from "react";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";

export interface SheetOptions {
	side?: "top" | "right" | "bottom" | "left";
	className?: string;
	onOpenChange?: (open: boolean) => void;
	title?: string;
	description?: string;
}

interface SheetProviderProps {
	children: React.ReactNode;
}

interface SheetContextType {
	isOpen: boolean;
	setOpen: (sheet: ReactNode, options?: SheetOptions) => void;
	setClose: () => void;
}

const SheetContext = createContext<SheetContextType>({
	isOpen: false,
	setOpen: () => {},
	setClose: () => {},
});

export const SheetProvider = ({ children }: SheetProviderProps) => {
	const [isOpen, setIsOpen] = useState(false);
	const [showingSheet, setShowingSheet] = useState<ReactNode>(null);
	const [options, setOptions] = useState<SheetOptions>({});
	const [isMounted, setIsMounted] = useState(false);

	useEffect(() => {
		setIsMounted(true);
	}, []);

	const setOpen = (sheet: ReactNode, options?: SheetOptions) => {
		if (sheet) {
			setShowingSheet(sheet);
			if (options) {
				setOptions(options);
			}
			setIsOpen(true);
		}
	};

	const setClose = () => {
		setIsOpen(false);
	};

	const onOpenChange = (open: boolean) => {
		setIsOpen(open);
		if (options.onOpenChange) {
			options.onOpenChange(open);
		}
	};
	if (!isMounted) return null;

	return (
		<SheetContext.Provider value={{ setClose, setOpen, isOpen }}>
			{children}
			<Sheet open={isOpen} onOpenChange={onOpenChange}>
				<SheetContent side={options.side} className={options.className}>
					{options.title && (
						<SheetHeader>
							<SheetTitle>{options.title}</SheetTitle>
							{options.description && (
								<SheetDescription>{options.description}</SheetDescription>
							)}
						</SheetHeader>
					)}
					<div className="px-4">{showingSheet}</div>
				</SheetContent>
			</Sheet>
		</SheetContext.Provider>
	);
};

export const useSheet = () => {
	const context = useContext(SheetContext);
	if (!context) throw new Error("useSheet used outside its provider.");

	return context;
};

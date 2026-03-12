import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}


export function toTitleCase(str: string) {
	return str
		.toLowerCase()
		.replace(/-/g, " ")
		.replace(/\b\w/g, (l) => l.toUpperCase());
}
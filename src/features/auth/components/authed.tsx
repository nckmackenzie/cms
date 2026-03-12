import type { PropsWithChildren } from "react";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "#/components/ui/card";

export function Authed({
	children,
	title,
	description,
}: PropsWithChildren<{ title: string; description: string }>) {
	return (
		<main className="bg-secondary min-h-dvh flex flex-col items-center justify-center mx-4 md:mx-0 ">
			<Card className="w-full max-w-md gap-8">
				<CardHeader>
					<CardTitle className="text-lg lg:text-2xl">{title}</CardTitle>
					<CardDescription>{description}</CardDescription>
				</CardHeader>
				<CardContent>{children}</CardContent>
			</Card>
		</main>
	);
}

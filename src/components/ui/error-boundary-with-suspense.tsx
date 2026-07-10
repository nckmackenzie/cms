import { Loader2Icon } from "lucide-react";
import type { PropsWithChildren } from "react";
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { ComponentErrorComponent } from "./route-components";

type Props = {
	loader?: React.ReactNode;
};

export function ErrorBoundaryWithSuspense({
	children,
	loader,
}: PropsWithChildren<Props>) {
	return (
		<ErrorBoundary
			fallbackRender={({ error, resetErrorBoundary }) => (
				<ComponentErrorComponent error={error} reset={resetErrorBoundary} />
			)}
		>
			<Suspense
				fallback={
					loader === undefined ? (
						<Loader2Icon className="animate-spin" />
					) : (
						loader
					)
				}
			>
				{children}
			</Suspense>
		</ErrorBoundary>
	);
}

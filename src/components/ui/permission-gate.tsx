import type { ReactNode } from "react";

interface PermissionGateProps {
	children: ReactNode;
	hasAccess: boolean;
	fallback?: ReactNode;
}

export function PermissionGate({
	children,
	hasAccess,
	fallback = null,
}: PermissionGateProps) {
	return hasAccess ? children : fallback;
}

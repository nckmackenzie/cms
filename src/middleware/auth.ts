import { createMiddleware } from "@tanstack/react-start";
import { getCurrentUserFn } from "#/features/auth/services/auth.api";

export const authMiddleware = createMiddleware().server(async ({ next }) => {
    const user = await getCurrentUserFn();

    if (!user) {
        throw new Error("Please log in to continue");
    }

    return next({
        context: {
            user,
        },
    });
});
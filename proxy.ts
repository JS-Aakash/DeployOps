import { withAuth } from "next-auth/middleware";

export default withAuth({
    pages: {
        signIn: "/login",
    },
});

export const config = {
    // Protect all routes except /login and /api/auth
    matcher: [
        "/((?!api/auth|login|_next/static|_next/image|favicon.ico).*)",
    ],
};

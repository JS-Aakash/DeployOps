import NextAuth, { NextAuthOptions } from "next-auth";
import GitHubProvider from "next-auth/providers/github";
import dbConnect from "@/lib/mongodb";
import { User } from "@/models";
import { logAudit } from "@/lib/audit-service";
import { checkIsGlobalAdmin } from "@/lib/auth-utils";

export const authOptions: NextAuthOptions = {
    providers: [
        GitHubProvider({
            clientId: process.env.GITHUB_CLIENT_ID || "",
            clientSecret: process.env.GITHUB_CLIENT_SECRET || "",
            authorization: {
                params: {
                    scope: "read:user user:email repo",
                },
            },
            profile(profile) {
                return {
                    id: profile.id.toString(),
                    name: profile.name || profile.login,
                    email: profile.email,
                    image: profile.avatar_url,
                    githubUsername: profile.login,
                };
            },
        }),
    ],
    callbacks: {
        async signIn({ user, account, profile }: any) {
            await dbConnect();
            try {
                const userCount = await User.countDocuments();
                const isAdminEmail = process.env.ADMIN_EMAIL && user.email.toLowerCase() === process.env.ADMIN_EMAIL.toLowerCase();

                const dbUser = await User.findOneAndUpdate(
                    { email: user.email.toLowerCase() },
                    {
                        name: user.name,
                        image: user.image,
                        githubUsername: user.githubUsername,
                        source: 'github',
                        // Promote to admin if specified in env OR if they are the first user ever
                        ...((isAdminEmail || userCount === 0) ? { role: 'admin' } : {})
                    },
                    { upsert: true, new: true }
                );

                // Log the audit event
                await logAudit({
                    actorId: dbUser._id.toString(),
                    actorName: dbUser.name,
                    actorType: 'user',
                    action: 'login',
                    entityType: 'auth',
                    entityId: dbUser._id.toString(),
                    description: `${dbUser.name} logged in via GitHub`
                });

                return true;
            } catch (error) {
                console.error("Error during sign in:", error);
                return false;
            }
        },
        async session({ session, token }: any) {
            if (session.user) {
                session.user.id = token.mongodbId;
                session.user.githubUsername = token.githubUsername;
                session.user.role = token.role;
                (session as any).accessToken = token.accessToken;
            }
            return session;
        },
        async jwt({ token, user, profile, account }: any) {
            if (account || profile) {
                // Initial sign in - fetch Mongo user _id
                if (token.email) {
                    await dbConnect();
                    const dbUser = await User.findOne({ email: token.email.toLowerCase() });
                    if (dbUser) {
                        token.mongodbId = dbUser._id.toString();

                        // Dynamically determine role: 
                        // If they have the 'admin' role in DB, they are admin.
                        // Otherwise, check if they own or manage any projects.
                        if ((dbUser as any).role === 'admin') {
                            token.role = 'admin';
                        } else {
                            // Run the complex logic from lib/auth-utils using the email directly
                            const isGlobal = await checkIsGlobalAdmin(token.email);
                            token.role = isGlobal ? 'admin' : 'user';
                        }
                    }
                }

                if (account) {
                    token.accessToken = account.access_token;
                }
                if (profile) {
                    token.githubUsername = (profile as any).login;
                }
            }
            return token;
        },
    },
    pages: {
        signIn: '/login',
    },
    session: {
        strategy: 'jwt',
    },
    secret: process.env.NEXTAUTH_SECRET || "fallback-secret-for-development-and-build",
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };

import NextAuth, { NextAuthOptions } from "next-auth";
import GitHubProvider from "next-auth/providers/github";
import dbConnect from "@/lib/mongodb";
import { User } from "@/models";

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
                // Upsert user in our database
                await User.findOneAndUpdate(
                    { email: user.email.toLowerCase() },
                    {
                        name: user.name,
                        image: user.image,
                        githubUsername: user.githubUsername,
                        source: 'github'
                    },
                    { upsert: true, new: true }
                );
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
    secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };

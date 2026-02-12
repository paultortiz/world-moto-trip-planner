import { getServerSession, type NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { logActivityAsync, ActivityActions } from "@/lib/activity";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  session: {
    strategy: "database",
  },
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        // Expose user id and role on the session so we can use them in route handlers.
        (session.user as any).id = (user as any).id;
        (session.user as any).role = (user as any).role;
      }
      return session;
    },
    async signIn({ user, account }) {
      // Log login activity (fire and forget)
      if (user?.id) {
        const isNewUser = account?.provider && !user.email;
        logActivityAsync({
          userId: user.id as string,
          action: isNewUser ? ActivityActions.USER_SIGNUP : ActivityActions.USER_LOGIN,
          metadata: { provider: account?.provider },
        });
      }
      return true;
    },
  },
};

export function auth() {
  return getServerSession(authOptions);
}

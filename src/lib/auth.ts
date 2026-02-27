import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const u = credentials?.username ?? "";
        const p = credentials?.password ?? "";

        if (
          u === (process.env.APP_USERNAME ?? "admin") &&
          p === (process.env.APP_PASSWORD ?? "change-me")
        ) {
          return { id: "single-user", name: u };
        }
        return null;
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
};

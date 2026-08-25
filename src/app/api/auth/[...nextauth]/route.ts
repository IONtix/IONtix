// src/app/api/auth/[...nextauth]/route.ts
import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import {
  checkLoginRateLimit,
  recordLoginFailure,
} from "@/lib/security/login-rate-limit";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, req) {
        if (
          !credentials?.email ||
          !credentials?.password
        ) {
          return null;
        }

        const email =
          credentials.email
            .trim()
            .toLowerCase();

        /*
         * Check rate limit before doing the
         * database lookup + bcrypt comparison.
         */
        const loginRateLimit =
          await checkLoginRateLimit({
            email,
            headers: new Headers(
              Object.entries(
                req.headers ?? {},
              ).reduce<Record<string, string>>(
                (acc, [key, value]) => {
                  if (
                    typeof value ===
                    "string"
                  ) {
                    acc[key] = value;
                  }

                  return acc;
                },
                {},
              ),
            ),
          });

        if (
          !loginRateLimit.allowed
        ) {
          return null;
        }

        const user =
          await prisma.user.findUnique({
            where: {
              email,
            },
            include: {
              role: true,
            },
          });

        if (
          !user ||
          !user.password ||
          user.isDeleted ||
          user.status !== "ACTIVE"
        ) {
          await recordLoginFailure({
            email,
            headers: new Headers(
              Object.entries(
                req.headers ?? {},
              ).reduce<Record<string, string>>(
                (acc, [key, value]) => {
                  if (
                    typeof value ===
                    "string"
                  ) {
                    acc[key] = value;
                  }

                  return acc;
                },
                {},
              ),
            ),
          });

          return null;
        }

        const isPasswordValid =
          await bcrypt.compare(
            credentials.password,
            user.password,
          );

        if (!isPasswordValid) {
          await recordLoginFailure({
            email,
            headers: new Headers(
              Object.entries(
                req.headers ?? {},
              ).reduce<Record<string, string>>(
                (acc, [key, value]) => {
                  if (
                    typeof value ===
                    "string"
                  ) {
                    acc[key] = value;
                  }

                  return acc;
                },
                {},
              ),
            ),
          });

          return null;
        }

        if (!user.role?.name) {
          return null;
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role.name,
        };
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session?.user) {
        session.user.id = typeof token.id === "string" ? token.id : "";
        session.user.role =
          typeof token.role === "string" && token.role.trim()
            ? token.role
            : "";
      }
      return session;
    },
  },

  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };

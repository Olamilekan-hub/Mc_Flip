import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { type DefaultSession, type NextAuthConfig } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { object, string, enum as zodEnum } from "zod";
import bcrypt from "bcrypt";
import { db } from "~/server/db";
import {
  accounts,
  sessions,
  users,
  verificationTokens,
} from "~/server/db/schema";
import { eq } from "drizzle-orm";

export const signInSchema = object({
  username: string({ required_error: "Username is required" })
    .min(1, "Username is required"),
  password: string({ required_error: "Password is required" })
    .min(1, "Password is required")
    .min(8, "Password must be more than 8 characters")
    .max(32, "Password must be less than 32 characters"),
  newUser: zodEnum(["true", "false"]).optional().default("false"),
});

async function hash(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

async function verify(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Module augmentation for `next-auth` types. Allows us to add custom properties to the `session`
 * object and keep type safety.
 *
 * @see https://next-auth.js.org/getting-started/typescript#module-augmentation
 */
declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
      // ...other properties
      // role: UserRole;
    } & DefaultSession["user"];
  }

  // interface User {
  //   // ...other properties
  //   // role: UserRole;
  // }
}

/**
 * Options for NextAuth.js used to configure adapters, providers, callbacks, etc.
 *
 * @see https://next-auth.js.org/configuration/options
 */
export const authConfig = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
        newUser: { label: "New User", type: "boolean" },
      },
      async authorize(credentials) {
        const { username, password, newUser } = await signInSchema.parseAsync(
          credentials
        );

        if (newUser === "true") {
          const existingUser = await db.query.users.findFirst({
            where: eq(users.email, username),
          });

          if (existingUser) {
            // User already exists
            return null;
          }

          const createdUser = await db
            .insert(users)
            .values({
              email: username,
              password: await hash(password),
            })
            .returning();

          return createdUser[0] ?? null;
        } else {
          const user = await db.query.users.findFirst({
            where: eq(users.email, username),
          });

          if (!user) {
            // User not found
            return null;
          }

          const passwordMatch = await verify(password, user.password);

          if (!passwordMatch) {
            // Password does not match
            return null;
          }

          return user;
        }
      },
    }),
    /**
     * ...add more providers here.
     *
     * Most other providers require a bit more work than the Discord provider. For example, the
     * GitHub provider requires you to add the `refresh_token_expires_in` field to the Account
     * model. Refer to the NextAuth.js docs for the provider you want to use. Example:
     *
     * @see https://next-auth.js.org/providers/github
     */
  ],
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  callbacks: {
    session: ({ session, token }) => {
      if (token && session.user) {
        session.user.id = token.sub ?? ""; // `token.sub` typically contains the user ID
      }
      return session;
    },
    /**
     * JWT callback is invoked whenever a JWT is created or updated.
     * This is a good place to add additional properties to the token if needed.
     */
    jwt: ({ token, user }) => {
      if (user) {
        token.sub = user.id; // Ensure the token has the user ID
      }
      return token;
    },
  },
  session: {
    strategy: "jwt",
  }
} satisfies NextAuthConfig;

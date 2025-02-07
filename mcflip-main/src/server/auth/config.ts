import { type DefaultSession, type NextAuthConfig } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { object, string } from "zod";
import { loginUser, registerUser } from "../../lib/firebase";

// Define schema for user authentication
export const signInSchema = object({
  username: string({ required_error: "Username is required" }).min(5, "Username is required"),
  password: string({ required_error: "Password is required" })
    .min(1, "Password is required")
    .min(8, "Password must be at least 8 characters")
    .max(32, "Password must be less than 32 characters"),
});

export const signUpSchema = object({
  username: string({ required_error: "Username is required" }).min(5, "Username is required"),
  email: string({ required_error: "Email is required" }).email("Invalid email format"),
  password: string({ required_error: "Password is required" })
    .min(1, "Password is required")
    .min(8, "Password must be at least 8 characters")
    .max(32, "Password must be less than 32 characters"),
});

/**
 * Module augmentation for `next-auth` types to include user ID in the session object.
 */
declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}

/**
 * NextAuth.js configuration object.
 */
export const authConfig = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        email: { label: "Email", type: "text", optional: true },
        password: { label: "Password", type: "password" },
        newUser: { label: "New User", type: "boolean", optional: true },
      },
      async authorize(credentials) {
        if (credentials.newUser === "true") {
          try {
            const { username, email, password } = await signUpSchema.parseAsync(credentials);
            const createdUser = await registerUser(username, email, password);
            return { id: createdUser.uid, name: username, email: email };
          } catch (error) {
            console.error("Registration failed:", error);
            return null;
          }
        } else {
          try {
            const { username, password } = await signInSchema.parseAsync(credentials);
            const user = await loginUser(username, password);
            return { id: user.uid, name: username };
          } catch (error) {
            console.error("Login failed:", error);
            return null;
          }
        }
      },
    }),
  ],
  callbacks: {
    session: ({ session, token }) => {
      if (token && session.user) {
        session.user.id = token.sub ?? ""; 
      }
      return session;
    },
    jwt: ({ token, user }) => {
      if (user) {
        token.sub = user.id; // Store user ID in JWT token
      }
      return token;
    },
  },
  session: {
    strategy: "jwt",
  },
} satisfies NextAuthConfig;
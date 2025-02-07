
import { type DefaultSession, type NextAuthConfig } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { object, string, enum as zodEnum } from "zod";
import { loginUser, registerUser } from "../../lib/firebase";

// Define schema for user authentication
export const signInSchema = object({
  username: string({ required_error: "Username is required" }).min(5, "Username is required"),
  email: string({ required_error: "email is required" }).min(5, "email is required"),
  password: string({ required_error: "Password is required" })
    .min(1, "Password is required")
    .min(8, "Password must be at least 8 characters")
    .max(32, "Password must be less than 32 characters"),
  newUser: zodEnum(["true", "false"]).optional().default("false"),
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
        email: { label: "email", type: "text" },
        password: { label: "Password", type: "password" },
        newUser: { label: "New User", type: "boolean" },
      },
      async authorize(credentials) {
        // Validate input credentials using Zod schema
        const { username, email, password, newUser } = await signInSchema.parseAsync(credentials);

        if (newUser === "true") {
          try {
            // Register the user in Firebase Authentication and Firestore
            const createdUser = await registerUser(username, email, password);
            return { id: createdUser.uid, name: username, email: email };
          } catch (error) {
            console.error("Registration failed:", error);
            return null;
          }
        } else {
          try {
            // Authenticate existing user using username
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
        session.user.id = token.sub ?? ""; // Assign Firebase user ID to session
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

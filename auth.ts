import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { authConfig } from "./auth.config";
import { connectDB } from "@/lib/db";
import { Customer } from "@/models/Customer";

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (
          !credentials ||
          typeof credentials.email !== "string" ||
          typeof credentials.password !== "string"
        ) {
          return null;
        }

        const email = credentials.email.trim().toLowerCase();
        const password = credentials.password;

        if (!email || !password) {
          return null;
        }

        await connectDB();

        // Must explicitly select +passwordHash because it is excluded by default (select: false)
        const customer = await Customer.findOne({ email }).select(
          "+passwordHash",
        );

        if (!customer || !customer.passwordHash) {
          return null;
        }

        const isPasswordValid = await bcrypt.compare(
          password,
          customer.passwordHash,
        );

        if (!isPasswordValid) {
          return null;
        }

        return {
          id: customer._id.toString(),
          name: customer.name,
          email: customer.email,
          role: customer.role,
        };
      },
    }),
  ],
});

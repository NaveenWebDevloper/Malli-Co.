import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { authConfig } from "./auth.config";
import { connectDB } from "@/lib/db";
import { Customer } from "@/models/Customer";

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Google({
      clientId:
        process.env.GOOGLE_CLIENT_ID || process.env.AUTH_GOOGLE_ID || "",
      clientSecret:
        process.env.GOOGLE_CLIENT_SECRET || process.env.AUTH_GOOGLE_SECRET || "",
      allowDangerousEmailAccountLinking: true,
    }),
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
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        if (!user.email) return false;
        try {
          await connectDB();
          const email = user.email.toLowerCase().trim();
          let customer = await Customer.findOne({ email });

          if (!customer) {
            customer = await Customer.create({
              name: user.name || "Malli & Co. Client",
              email,
              role: "CUSTOMER",
              addresses: [],
            });
          }

          user.id = customer._id.toString();
          user.role = customer.role;
          return true;
        } catch (dbErr) {
          console.error("Failed to sync Google customer:", dbErr);
          return false;
        }
      }
      return true;
    },
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      if (account?.provider === "google" && token.email) {
        try {
          await connectDB();
          const customer = await Customer.findOne({
            email: token.email.toLowerCase().trim(),
          });
          if (customer) {
            token.id = customer._id.toString();
            token.role = customer.role;
          }
        } catch (err) {
          console.error("JWT Google user fetch error:", err);
        }
      }
      return token;
    },
  },
});

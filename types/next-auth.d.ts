import type { DefaultSession } from "next-auth";
import type { JWT as DefaultJWT } from "next-auth/jwt";

declare module "next-auth" {
  interface User {
    id?: string;
    role?: "CUSTOMER" | "ADMIN";
  }

  interface Session {
    user: {
      id: string;
      role: "CUSTOMER" | "ADMIN";
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id?: string;
    role?: "CUSTOMER" | "ADMIN";
  }
}

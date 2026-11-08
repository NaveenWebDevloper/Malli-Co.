"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export interface AuthFormProps {
  defaultTab?: "signin" | "register";
  callbackUrl?: string;
  onSuccess?: () => void;
}

export function AuthForm({
  defaultTab = "signin",
  callbackUrl = "/account",
  onSuccess,
}: AuthFormProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"signin" | "register">(defaultTab);

  // Sign In state
  const [signInEmail, setSignInEmail] = useState("");
  const [signInPassword, setSignInPassword] = useState("");
  const [signInLoading, setSignInLoading] = useState(false);
  const [signInError, setSignInError] = useState<string | null>(null);

  // Register state
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirmPassword, setRegConfirmPassword] = useState("");
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState<string | null>(null);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignInLoading(true);
    setSignInError(null);

    try {
      const res = await signIn("credentials", {
        email: signInEmail.trim(),
        password: signInPassword,
        redirect: false,
      });

      if (res?.error) {
        setSignInError("Invalid email or password. Please try again.");
        setSignInLoading(false);
        return;
      }

      if (onSuccess) {
        onSuccess();
      } else {
        router.push(callbackUrl);
        router.refresh();
      }
    } catch {
      setSignInError("An unexpected error occurred during sign in.");
      setSignInLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegLoading(true);
    setRegError(null);

    if (regPassword.length < 6) {
      setRegError("Password must be at least 6 characters.");
      setRegLoading(false);
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setRegError("Passwords do not match.");
      setRegLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: regName.trim(),
          email: regEmail.trim(),
          phone: regPhone.trim(),
          password: regPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setRegError(data.error || "Failed to create account.");
        setRegLoading(false);
        return;
      }

      // Automatically sign in upon successful registration
      const loginRes = await signIn("credentials", {
        email: regEmail.trim(),
        password: regPassword,
        redirect: false,
      });

      if (loginRes?.error) {
        // Fallback to signin tab if automatic login had an issue
        setActiveTab("signin");
        setSignInEmail(regEmail.trim());
        setSignInError("Account created! Please enter your password to sign in.");
        setRegLoading(false);
        return;
      }

      if (onSuccess) {
        onSuccess();
      } else {
        router.push(callbackUrl);
        router.refresh();
      }
    } catch {
      setRegError("Network error. Please try again.");
      setRegLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Tab Switcher */}
      <div className="flex border-b border-[#EAE3D4] mb-8">
        <button
          type="button"
          onClick={() => {
            setActiveTab("signin");
            setSignInError(null);
          }}
          className={`flex-1 pb-3 text-xs font-serif font-bold uppercase tracking-[0.2em] transition-all relative ${
            activeTab === "signin"
              ? "text-[#121212]"
              : "text-neutral-400 hover:text-neutral-700"
          }`}
        >
          Sign In
          {activeTab === "signin" && (
            <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#121212]" />
          )}
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveTab("register");
            setRegError(null);
          }}
          className={`flex-1 pb-3 text-xs font-serif font-bold uppercase tracking-[0.2em] transition-all relative ${
            activeTab === "register"
              ? "text-[#121212]"
              : "text-neutral-400 hover:text-neutral-700"
          }`}
        >
          Create Account
          {activeTab === "register" && (
            <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#121212]" />
          )}
        </button>
      </div>

      {/* SIGN IN TAB */}
      {activeTab === "signin" && (
        <form onSubmit={handleSignIn} className="space-y-4">
          {signInError && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
              {signInError}
            </div>
          )}

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600 mb-1.5">
              Email Address
            </label>
            <input
              type="email"
              required
              value={signInEmail}
              onChange={(e) => setSignInEmail(e.target.value)}
              placeholder="client@malliandco.com"
              className="w-full px-4 py-2.5 rounded-xl border border-[#EAE3D4] bg-[#FBF9F5] text-sm text-[#121212] focus:outline-none focus:border-[#121212] focus:bg-white transition-all placeholder:text-neutral-400"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600 mb-1.5">
              Password
            </label>
            <input
              type="password"
              required
              value={signInPassword}
              onChange={(e) => setSignInPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full px-4 py-2.5 rounded-xl border border-[#EAE3D4] bg-[#FBF9F5] text-sm text-[#121212] focus:outline-none focus:border-[#121212] focus:bg-white transition-all placeholder:text-neutral-400"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={signInLoading}
              className="w-full py-3.5 rounded-full bg-[#121212] text-white text-xs font-serif font-bold uppercase tracking-[0.2em] shadow-lg hover:bg-neutral-800 disabled:opacity-50 transition-all active:scale-[0.99] flex items-center justify-center"
            >
              {signInLoading ? "Authenticating..." : "Sign In to Account"}
            </button>
          </div>
        </form>
      )}

      {/* REGISTER TAB */}
      {activeTab === "register" && (
        <form onSubmit={handleRegister} className="space-y-4">
          {regError && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
              {regError}
            </div>
          )}

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600 mb-1.5">
              Full Name
            </label>
            <input
              type="text"
              required
              value={regName}
              onChange={(e) => setRegName(e.target.value)}
              placeholder="Naveen Vadla"
              className="w-full px-4 py-2.5 rounded-xl border border-[#EAE3D4] bg-[#FBF9F5] text-sm text-[#121212] focus:outline-none focus:border-[#121212] focus:bg-white transition-all placeholder:text-neutral-400"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600 mb-1.5">
              Email Address
            </label>
            <input
              type="email"
              required
              value={regEmail}
              onChange={(e) => setRegEmail(e.target.value)}
              placeholder="client@malliandco.com"
              className="w-full px-4 py-2.5 rounded-xl border border-[#EAE3D4] bg-[#FBF9F5] text-sm text-[#121212] focus:outline-none focus:border-[#121212] focus:bg-white transition-all placeholder:text-neutral-400"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600 mb-1.5">
              Phone Number
            </label>
            <input
              type="tel"
              value={regPhone}
              onChange={(e) => setRegPhone(e.target.value)}
              placeholder="+91 98765 43210"
              className="w-full px-4 py-2.5 rounded-xl border border-[#EAE3D4] bg-[#FBF9F5] text-sm text-[#121212] focus:outline-none focus:border-[#121212] focus:bg-white transition-all placeholder:text-neutral-400"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600 mb-1.5">
              Password (min 6 characters)
            </label>
            <input
              type="password"
              required
              value={regPassword}
              onChange={(e) => setRegPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full px-4 py-2.5 rounded-xl border border-[#EAE3D4] bg-[#FBF9F5] text-sm text-[#121212] focus:outline-none focus:border-[#121212] focus:bg-white transition-all placeholder:text-neutral-400"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600 mb-1.5">
              Confirm Password
            </label>
            <input
              type="password"
              required
              value={regConfirmPassword}
              onChange={(e) => setRegConfirmPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full px-4 py-2.5 rounded-xl border border-[#EAE3D4] bg-[#FBF9F5] text-sm text-[#121212] focus:outline-none focus:border-[#121212] focus:bg-white transition-all placeholder:text-neutral-400"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={regLoading}
              className="w-full py-3.5 rounded-full bg-[#121212] text-white text-xs font-serif font-bold uppercase tracking-[0.2em] shadow-lg hover:bg-neutral-800 disabled:opacity-50 transition-all active:scale-[0.99] flex items-center justify-center"
            >
              {regLoading ? "Creating Account..." : "Create Malli & Co. Account"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}


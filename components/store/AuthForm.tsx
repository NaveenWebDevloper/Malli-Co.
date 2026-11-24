"use client";

import { useState } from "react";
import Image from "next/image";
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
  const [showSignInPassword, setShowSignInPassword] = useState(false);
  const [signInLoading, setSignInLoading] = useState(false);
  const [signInError, setSignInError] = useState<string | null>(null);

  // Register state
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirmPassword, setRegConfirmPassword] = useState("");
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegConfirmPassword, setShowRegConfirmPassword] = useState(false);
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState<string | null>(null);

  // Forgot Password modal state
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSubmitted, setForgotSubmitted] = useState(false);
  const [socialNotice, setSocialNotice] = useState<string | null>(null);

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
        if (
          signInEmail.trim().toLowerCase() === "admin@malliandco.com" &&
          callbackUrl === "/account"
        ) {
          router.push("/admin");
        } else {
          router.push(callbackUrl);
        }
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

  const handleFacebookSignIn = () => {
    setSocialNotice("Facebook sign-in will be enabled shortly. Please use Google or your Email to sign in.");
    setTimeout(() => setSocialNotice(null), 5000);
  };

  const handleForgotPasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setForgotSubmitted(true);
  };

  return (
    <div className="w-full max-w-5xl mx-auto rounded-3xl bg-white border border-neutral-200/90 shadow-sm overflow-hidden font-sans">
      <div className="flex flex-col lg:flex-row items-stretch">
        
        {/* Left Section: Shopping Bags Visual, Welcome Heading, & Benefits */}
        <div className="w-full lg:w-7/12 p-6 sm:p-10 lg:p-12 flex flex-col justify-between bg-gradient-to-br from-white via-[#FCFBF8] to-[#F7F4EC]/60 border-b lg:border-b-0 lg:border-r border-neutral-200/80">
          
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 lg:gap-8">
            {/* Boutique Shopping Bags Image */}
            <div className="relative w-40 h-36 sm:w-48 sm:h-44 flex-shrink-0 rounded-2xl overflow-hidden shadow-sm bg-neutral-100 border border-neutral-200/70">
              <Image
                src="/images/auth-bags.png"
                alt="Malli & Co. Luxury Shopping Bags"
                fill
                priority
                className="object-cover"
              />
            </div>

            {/* Headline & Perks */}
            <div className="space-y-4 text-center sm:text-left flex-1">
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-[#10264B] tracking-tight">
                  {activeTab === "signin" ? "Welcome Back!" : "Join Malli & Co.!"}
                </h1>
                <p className="text-xs sm:text-sm text-neutral-600 mt-1">
                  {activeTab === "signin"
                    ? "Login to continue your shopping experience"
                    : "Create an account to unlock exclusive member privileges"}
                </p>
              </div>

              {/* Benefit Bullets */}
              <div className="pt-2 space-y-3 text-left">
                {/* 1. Track Orders */}
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-50 text-[#10264B] flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-[#10264B]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
                    </svg>
                  </div>
                  <span className="text-xs sm:text-sm font-semibold text-neutral-800">
                    {activeTab === "signin" ? "Track Your Orders" : "Real-time Order Tracking"}
                  </span>
                </div>

                {/* 2. Save Favorites */}
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                  </div>
                  <span className="text-xs sm:text-sm font-semibold text-neutral-800">
                    {activeTab === "signin" ? "Save Your Favorites" : "Wishlist & Saved Wardrobe"}
                  </span>
                </div>

                {/* 3. Faster Checkout */}
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <span className="text-xs sm:text-sm font-semibold text-neutral-800">
                    {activeTab === "signin" ? "Faster Checkout" : "One-Click Express Checkout"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Trust Badge at bottom of left panel */}
          <div className="hidden lg:flex items-center gap-6 pt-8 mt-6 border-t border-neutral-200/60 text-[11px] text-neutral-500">
            <span className="flex items-center gap-1.5">
              <span className="text-emerald-600 font-bold">✓</span> 100% Genuine Apparel
            </span>
            <span className="flex items-center gap-1.5">
              <span className="text-emerald-600 font-bold">🔒</span> Secure Authentication
            </span>
            <span className="flex items-center gap-1.5">
              <span className="text-emerald-600 font-bold">⚡</span> Instant Verification
            </span>
          </div>
        </div>

        {/* Right Section: Form Card (Login & Register Tabs) */}
        <div className="w-full lg:w-5/12 p-6 sm:p-10 flex flex-col justify-center bg-white">
          
          {/* Segmented Top Tabs */}
          <div className="flex border-b border-neutral-200 pb-1 mb-6">
            <button
              type="button"
              onClick={() => {
                setActiveTab("signin");
                setSignInError(null);
              }}
              className={`flex-1 py-2 text-center text-sm font-bold transition-all relative ${
                activeTab === "signin"
                  ? "text-[#10264B]"
                  : "text-neutral-400 hover:text-neutral-700 font-medium"
              }`}
            >
              Login
              {activeTab === "signin" && (
                <span className="absolute -bottom-1 left-4 right-4 h-1 bg-[#F5B817] rounded-full" />
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab("register");
                setRegError(null);
              }}
              className={`flex-1 py-2 text-center text-sm font-bold transition-all relative ${
                activeTab === "register"
                  ? "text-[#10264B]"
                  : "text-neutral-400 hover:text-neutral-700 font-medium"
              }`}
            >
              Register
              {activeTab === "register" && (
                <span className="absolute -bottom-1 left-4 right-4 h-1 bg-[#F5B817] rounded-full" />
              )}
            </button>
          </div>

          {socialNotice && (
            <div className="mb-4 p-2.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs">
              {socialNotice}
            </div>
          )}

          {/* SIGN IN FORM */}
          {activeTab === "signin" && (
            <form onSubmit={handleSignIn} className="space-y-4">
              {signInError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
                  {signInError}
                </div>
              )}

              {/* Email Address */}
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1.5">
                  Email Address <span className="text-red-500 font-bold">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={signInEmail}
                  onChange={(e) => setSignInEmail(e.target.value)}
                  placeholder="achyuta@mail.com"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 bg-white text-xs sm:text-sm text-[#10264B] focus:outline-none focus:border-[#F5B817] focus:ring-1 focus:ring-[#F5B817] transition-all placeholder:text-neutral-400"
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1.5">
                  Password <span className="text-red-500 font-bold">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showSignInPassword ? "text" : "password"}
                    required
                    value={signInPassword}
                    onChange={(e) => setSignInPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-neutral-300 bg-white text-xs sm:text-sm text-[#10264B] focus:outline-none focus:border-[#F5B817] focus:ring-1 focus:ring-[#F5B817] transition-all placeholder:text-neutral-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSignInPassword(!showSignInPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 focus:outline-none"
                    aria-label={showSignInPassword ? "Hide password" : "Show password"}
                  >
                    {showSignInPassword ? (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setForgotEmail(signInEmail);
                      setShowForgotPassword(true);
                    }}
                    className="text-xs font-semibold text-[#1A56DB] hover:underline"
                  >
                    Forgot Password?
                  </button>
                </div>
              </div>

              {/* Login Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={signInLoading}
                  className="w-full py-3 rounded-xl bg-[#F5B817] hover:bg-[#E5A707] text-[#10264B] font-bold text-sm tracking-wide shadow-sm transition active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {signInLoading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-[#10264B] border-t-transparent rounded-full animate-spin" />
                      <span>Authenticating...</span>
                    </>
                  ) : (
                    <span>Login</span>
                  )}
                </button>
              </div>

              {/* Divider: Or continue with */}
              <div className="relative flex items-center justify-center my-4">
                <div className="border-t border-neutral-200 w-full" />
                <span className="bg-white px-3 text-xs text-neutral-400 font-medium absolute">
                  Or continue with
                </span>
              </div>

              {/* Social Logins: Google & Facebook side-by-side */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => signIn("google", { callbackUrl })}
                  className="w-full py-2.5 px-3 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 text-xs font-bold text-neutral-800 transition flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  <span>Google</span>
                </button>

                <button
                  type="button"
                  onClick={handleFacebookSignIn}
                  className="w-full py-2.5 px-3 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 text-xs font-bold text-neutral-800 transition flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                >
                  <svg className="w-4 h-4 fill-[#1877F2]" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                  <span>Facebook</span>
                </button>
              </div>

              {/* Bottom Switcher */}
              <div className="pt-2 text-center text-xs text-neutral-600">
                Don&apos;t have an account?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("register");
                    setRegError(null);
                  }}
                  className="text-[#1A56DB] font-bold hover:underline cursor-pointer"
                >
                  Create Account
                </button>
              </div>
            </form>
          )}

          {/* REGISTER FORM */}
          {activeTab === "register" && (
            <form onSubmit={handleRegister} className="space-y-3.5">
              {regError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
                  {regError}
                </div>
              )}

              {/* Full Name */}
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  Full Name <span className="text-red-500 font-bold">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="e.g. Achyuta"
                  className="w-full px-3.5 py-2 rounded-xl border border-neutral-300 bg-white text-xs sm:text-sm text-[#10264B] focus:outline-none focus:border-[#F5B817] focus:ring-1 focus:ring-[#F5B817] transition-all placeholder:text-neutral-400"
                />
              </div>

              {/* Email Address */}
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  Email Address <span className="text-red-500 font-bold">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="achyuta@mail.com"
                  className="w-full px-3.5 py-2 rounded-xl border border-neutral-300 bg-white text-xs sm:text-sm text-[#10264B] focus:outline-none focus:border-[#F5B817] focus:ring-1 focus:ring-[#F5B817] transition-all placeholder:text-neutral-400"
                />
              </div>

              {/* Phone Number */}
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={regPhone}
                  onChange={(e) => setRegPhone(e.target.value)}
                  placeholder="+91 91219 92349"
                  className="w-full px-3.5 py-2 rounded-xl border border-neutral-300 bg-white text-xs sm:text-sm text-[#10264B] focus:outline-none focus:border-[#F5B817] focus:ring-1 focus:ring-[#F5B817] transition-all placeholder:text-neutral-400"
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  Password <span className="text-red-500 font-bold">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showRegPassword ? "text" : "password"}
                    required
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Min 6 characters"
                    className="w-full pl-3.5 pr-10 py-2 rounded-xl border border-neutral-300 bg-white text-xs sm:text-sm text-[#10264B] focus:outline-none focus:border-[#F5B817] focus:ring-1 focus:ring-[#F5B817] transition-all placeholder:text-neutral-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegPassword(!showRegPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 focus:outline-none"
                    aria-label={showRegPassword ? "Hide password" : "Show password"}
                  >
                    {showRegPassword ? (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  Confirm Password <span className="text-red-500 font-bold">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showRegConfirmPassword ? "text" : "password"}
                    required
                    value={regConfirmPassword}
                    onChange={(e) => setRegConfirmPassword(e.target.value)}
                    placeholder="Repeat password"
                    className="w-full pl-3.5 pr-10 py-2 rounded-xl border border-neutral-300 bg-white text-xs sm:text-sm text-[#10264B] focus:outline-none focus:border-[#F5B817] focus:ring-1 focus:ring-[#F5B817] transition-all placeholder:text-neutral-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegConfirmPassword(!showRegConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 focus:outline-none"
                    aria-label={showRegConfirmPassword ? "Hide password" : "Show password"}
                  >
                    {showRegConfirmPassword ? (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Register Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={regLoading}
                  className="w-full py-3 rounded-xl bg-[#F5B817] hover:bg-[#E5A707] text-[#10264B] font-bold text-sm tracking-wide shadow-sm transition active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {regLoading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-[#10264B] border-t-transparent rounded-full animate-spin" />
                      <span>Creating Account...</span>
                    </>
                  ) : (
                    <span>Register</span>
                  )}
                </button>
              </div>

              {/* Divider: Or continue with */}
              <div className="relative flex items-center justify-center my-3">
                <div className="border-t border-neutral-200 w-full" />
                <span className="bg-white px-3 text-xs text-neutral-400 font-medium absolute">
                  Or continue with
                </span>
              </div>

              {/* Social Logins */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => signIn("google", { callbackUrl })}
                  className="w-full py-2 px-3 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 text-xs font-bold text-neutral-800 transition flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  <span>Google</span>
                </button>

                <button
                  type="button"
                  onClick={handleFacebookSignIn}
                  className="w-full py-2 px-3 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 text-xs font-bold text-neutral-800 transition flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                >
                  <svg className="w-4 h-4 fill-[#1877F2]" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                  <span>Facebook</span>
                </button>
              </div>

              {/* Bottom Switcher */}
              <div className="pt-2 text-center text-xs text-neutral-600">
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("signin");
                    setSignInError(null);
                  }}
                  className="text-[#1A56DB] font-bold hover:underline cursor-pointer"
                >
                  Login
                </button>
              </div>
            </form>
          )}

        </div>

      </div>

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 sm:p-8 shadow-2xl border border-neutral-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
              <h3 className="text-base font-bold text-[#10264B]">
                Reset Your Password
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowForgotPassword(false);
                  setForgotSubmitted(false);
                }}
                className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center text-neutral-600 transition"
              >
                ✕
              </button>
            </div>

            {forgotSubmitted ? (
              <div className="space-y-4 text-center py-4">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 text-xl flex items-center justify-center mx-auto">
                  ✓
                </div>
                <p className="text-sm font-bold text-neutral-900">
                  Password Recovery Requested
                </p>
                <p className="text-xs text-neutral-600 leading-relaxed">
                  If an account exists for <strong>{forgotEmail}</strong>, password reset guidance has been sent. You can also reach our customer support directly via WhatsApp for quick assistance.
                </p>
                <div className="pt-2 flex flex-col gap-2">
                  <a
                    href={`https://wa.me/919121992349?text=${encodeURIComponent(`Hi Malli & Co., I need assistance recovering my account: ${forgotEmail}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition"
                  >
                    Contact Support via WhatsApp
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      setShowForgotPassword(false);
                      setForgotSubmitted(false);
                    }}
                    className="w-full py-2.5 rounded-xl border border-neutral-300 text-neutral-700 font-bold text-xs hover:bg-neutral-50 transition"
                  >
                    Back to Login
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
                <p className="text-xs text-neutral-600 leading-relaxed">
                  Enter your registered email address and we will provide password reset instructions or connect you with our help desk.
                </p>
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    Registered Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="achyuta@mail.com"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-sm text-[#10264B] focus:border-[#F5B817] focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-[#F5B817] hover:bg-[#E5A707] text-[#10264B] font-bold text-xs uppercase tracking-wider transition"
                >
                  Send Recovery Link
                </button>
              </form>
            )}
          </div>
        </div>
      )}

    </div>
  );
}

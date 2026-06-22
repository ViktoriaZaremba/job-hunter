"use client";

import { signIn } from "next-auth/react";
import { Chrome } from "lucide-react";

export default function SignIn() {
  const handleGoogleSignIn = () => {
    signIn("google", { callbackUrl: "/dashboard" });
  };

  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center px-6">
      <div className="card w-full max-w-md p-8">
        <div className="text-center mb-7">
          <h1 className="text-h2">Welcome back</h1>
          <p className="text-text-secondary mt-1.5">
            Sign in to continue tracking your job search.
          </p>
        </div>

        <button
          onClick={handleGoogleSignIn}
          className="btn-secondary w-full h-11"
        >
          <Chrome size={18} />
          Continue with Google
        </button>

        <p className="mt-7 text-center text-[12px] text-text-muted">
          By continuing you agree to use this app for personal job tracking.
        </p>
      </div>
    </div>
  );
}

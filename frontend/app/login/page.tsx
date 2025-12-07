"use client";

import { useEffect } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight } from "lucide-react";

export default function LoginPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";

  useEffect(() => {
    if (status === "authenticated") {
      router.replace(callbackUrl);
    }
  }, [status, router, callbackUrl]);

  return (
    <div className="min-h-screen bg-[#f4f2ee] flex items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="text-center">
          <h1 className="text-lg font-semibold text-slate-900">NovaProwl</h1>
          <p className="text-xs text-slate-500 mt-1">
            Sign in to continue to your workspace
          </p>
        </div>

        <button
          onClick={() =>
            signIn("google", {
              callbackUrl,
            })
          }
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 488 512"
            className="w-4 h-4"
            fill="currentColor"
          >
            <path d="M488 261.8c0-17.8-1.6-35-4.6-51.8H249v98.2h134c-5.8 31.4-23.5 58-50 75.8v62.9h80.8C462.5 403.3 488 337.5 488 261.8z" />
            <path d="M249 512c67.5 0 124-22.5 165.3-61.1l-80.8-62.9c-22.5 15-51.3 23.8-84.5 23.8-65 0-120-43.8-139.6-102.6H27.6v64.5C68.8 457.3 152.4 512 249 512z" />
            <path d="M109.4 308.2c-4.8-14.2-7.6-29.2-7.6-44.6s2.8-30.4 7.6-44.6v-64.5H27.6C10 186.4 0 222.4 0 261.8s10 75.4 27.6 107.2l81.8-60.8z" />
            <path d="M249 144.7c35.9 0 68.1 12.3 93.4 36.4l70-70C373 54.6 316.5 32 249 32 152.4 32 68.8 86.7 27.6 183.6l81.8 60.8C129 188.5 184 144.7 249 144.7z" />
          </svg>
          Sign in with Google
          <ArrowRight className="w-4 h-4" />
        </button>

        <div className="text-[11px] text-slate-500 text-center">
          By continuing you agree to the Terms and Privacy Policy.
        </div>
      </div>
    </div>
  );
}

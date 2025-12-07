"use client";

import { signOut } from "next-auth/react";
import React from "react";

export function LogoutButton({
  className = "",
  label = "Logout",
}: {
  className?: string;
  label?: string;
}) {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/login" })}
      className={className}
    >
      {label}
    </button>
  );
}

"use client";

if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
  const originalError = console.error;
  console.error = (...args: any[]) => {
    const msg = typeof args[0] === "string" ? args[0] : "";
    if (
      msg.includes("Encountered a script tag while rendering React component") ||
      msg.includes("Scripts inside React components are never executed")
    ) {
      return;
    }
    originalError.apply(console, args);
  };
}

export function SuppressWarnings() {
  return null;
}

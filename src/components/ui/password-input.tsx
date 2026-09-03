"use client";

import { useState, forwardRef } from "react";
import { HiOutlineEye, HiOutlineEyeSlash } from "react-icons/hi2";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export const PasswordInput = forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, ...props }, ref) => {
    const [show, setShow] = useState(false);

    return (
      <div className="relative">
        <Input
          type={show ? "text" : "password"}
          className={cn("pr-10", className)}
          ref={ref}
          {...props}
        />
        <button
          type="button"
          tabIndex={-1}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => setShow(!show)}
          aria-label={show ? "Şifreyi gizle" : "Şifreyi göster"}
        >
          {show ? (
            <HiOutlineEyeSlash className="size-4" />
          ) : (
            <HiOutlineEye className="size-4" />
          )}
        </button>
      </div>
    );
  }
);
PasswordInput.displayName = "PasswordInput";

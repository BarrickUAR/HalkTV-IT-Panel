"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { HiOutlineInformationCircle, HiOutlineCheckCircle, HiOutlineExclamationTriangle, HiOutlineXCircle, HiOutlineArrowPath } from "react-icons/hi2";

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: (
          <HiOutlineCheckCircle className="size-4" />
        ),
        info: (
          <HiOutlineInformationCircle className="size-4" />
        ),
        warning: (
          <HiOutlineExclamationTriangle className="size-4" />
        ),
        error: (
          <HiOutlineXCircle className="size-4" />
        ),
        loading: (
          <HiOutlineArrowPath className="size-4 animate-spin" />
        ),
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "cn-toast",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }

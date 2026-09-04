"use client";

import { HiOutlineDocumentArrowDown } from "react-icons/hi2";
import { Button } from "@/components/ui/button";

export function PrintReportButton() {
  return (
    <Button
      variant="outline"
      size="sm"
      className="gap-2"
      onClick={() => window.print()}
    >
      <HiOutlineDocumentArrowDown className="size-4" />
      PDF Olarak İndir
    </Button>
  );
}

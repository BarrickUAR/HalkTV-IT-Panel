import type { Metadata } from "next";
import Link from "next/link";
import { HiOutlineArrowLeft } from "react-icons/hi2";
import { prisma } from "@/lib/prisma";

import { NewTicketForm } from "./new-ticket-form";

export const metadata: Metadata = { title: "Yeni Talep" };

export default async function NewTicketPage() {
  let departments: { id: string; name: string }[] = [];
  try {
    departments = await prisma.department.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
  } catch {
    departments = [];
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link
          href="/tickets"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <HiOutlineArrowLeft className="size-4" /> Talepler
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">Yeni Talep</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Sorununu anlat, IT ekibi ilgilensin.
        </p>
      </div>
      <div className="rounded-xl border bg-card p-6">
        <NewTicketForm departments={departments} />
      </div>
    </div>
  );
}

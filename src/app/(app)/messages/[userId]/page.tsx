import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { HiOutlineArrowLeft, HiOutlineUser } from "react-icons/hi2";

import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { ROLE_LABELS } from "@/lib/rbac/roles";

import { fetchThread, markThreadRead } from "../actions";
import { MessageThread } from "./message-thread";

export default async function ThreadPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const me = await requireUser();
  if (userId === me.id) redirect("/messages");

  const other = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, title: true, role: true },
  });
  if (!other) notFound();

  const initial = await fetchThread(userId);
  await markThreadRead(userId);

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Link
        href="/messages"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <HiOutlineArrowLeft className="size-4" /> Mesajlar
      </Link>

      <div className="flex items-center gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <HiOutlineUser className="size-5" />
        </div>
        <div>
          <p className="font-semibold">{other.name ?? other.email}</p>
          <p className="text-xs text-muted-foreground">
            {other.title ?? ROLE_LABELS[other.role]}
          </p>
        </div>
      </div>

      <MessageThread otherId={other.id} initial={initial} />
    </div>
  );
}

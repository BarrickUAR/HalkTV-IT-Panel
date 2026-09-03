"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireRole } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import type { TicketCategory } from "@prisma/client";

const schema = z.object({
  title: z.string().trim().min(5, "Başlık en az 5 karakter olmalı."),
  content: z.string().trim().min(10, "İçerik çok kısa."),
  category: z.enum(["HARDWARE", "SOFTWARE", "ACCOUNT_ACCESS", "NETWORK", "EMAIL", "OTHER"]),
  isPublished: z.coerce.boolean(),
});

export async function createArticleAction(_prev: any, formData: FormData) {
  // Sadece IT personeli makale ekleyebilir
  const user = await requireRole(["IT_AGENT", "IT_LEAD", "IT_MANAGER", "SUPER_ADMIN"]);

  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message };
  }

  await prisma.knowledgeArticle.create({
    data: {
      title: parsed.data.title,
      content: parsed.data.content,
      category: parsed.data.category as TicketCategory,
      isPublished: parsed.data.isPublished,
      authorId: user.id,
    }
  });

  revalidatePath("/knowledge");
  redirect("/knowledge");
}

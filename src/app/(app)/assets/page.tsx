import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-helpers";
import { isITStaff } from "@/lib/rbac/permissions";

async function createAsset(formData: FormData) {
  "use server";
  const user = await requireUser();
  if (!isITStaff(user.role)) return;
  const assetTag = String(formData.get("assetTag") || "").trim().toUpperCase();
  const type = String(formData.get("type") || "").trim();
  if (!assetTag || !type) return;
  await prisma.asset.create({ data: { assetTag, type, brand: String(formData.get("brand") || "").trim() || null, model: String(formData.get("model") || "").trim() || null, serialNumber: String(formData.get("serialNumber") || "").trim() || null, location: String(formData.get("location") || "").trim() || null } });
  revalidatePath("/assets");
}

async function assignAsset(formData: FormData) {
  "use server";
  const user = await requireUser();
  if (!isITStaff(user.role)) return;
  const assetId = String(formData.get("assetId") || "");
  const userId = String(formData.get("userId") || "");
  if (!assetId || !userId) return;
  const current = await prisma.assetAssignment.findFirst({ where: { assetId, returnedAt: null } });
  if (!current) await prisma.$transaction([prisma.assetAssignment.create({ data: { assetId, userId } }), prisma.asset.update({ where: { id: assetId }, data: { status: "ASSIGNED" } })]);
  revalidatePath("/assets");
}

async function returnAsset(formData: FormData) {
  "use server";
  const user = await requireUser();
  if (!isITStaff(user.role)) return;
  const assignmentId = String(formData.get("assignmentId") || "");
  const assetId = String(formData.get("assetId") || "");
  if (!assignmentId || !assetId) return;
  await prisma.$transaction([prisma.assetAssignment.update({ where: { id: assignmentId }, data: { returnedAt: new Date() } }), prisma.asset.update({ where: { id: assetId }, data: { status: "IN_STOCK" } })]);
  revalidatePath("/assets");
}

export default async function AssetsPage() {
  const viewer = await requireUser();
  if (!isITStaff(viewer.role)) redirect("/dashboard");
  const [assets, users] = await Promise.all([
    prisma.asset.findMany({ orderBy: { updatedAt: "desc" }, include: { assignments: { where: { returnedAt: null }, include: { user: { select: { id: true, name: true, email: true, title: true } } }, take: 1 } } }),
    prisma.user.findMany({ where: { status: "ACTIVE" }, select: { id: true, name: true, email: true }, orderBy: { name: "asc" } }),
  ]);
  const assigned = assets.filter(a => a.assignments.length).length;
  return <div className="space-y-5 p-1">
    <div><p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Envanter</p><h1 className="text-2xl font-bold">Demirbaş ve zimmet yönetimi</h1><p className="text-sm text-muted-foreground">Monitör, telefon, kamera, lisans ve diğer ekipmanların güncel zimmetini takip edin.</p></div>
    <div className="grid gap-3 sm:grid-cols-3"><div className="rounded-xl border bg-card p-4"><small>Toplam demirbaş</small><strong className="block text-2xl">{assets.length}</strong></div><div className="rounded-xl border bg-card p-4"><small>Zimmetli</small><strong className="block text-2xl text-blue-700">{assigned}</strong></div><div className="rounded-xl border bg-card p-4"><small>Stokta</small><strong className="block text-2xl text-emerald-700">{assets.length-assigned}</strong></div></div>
    <form action={createAsset} className="grid gap-3 rounded-xl border bg-card p-4 md:grid-cols-6"><input required name="assetTag" placeholder="Demirbaş no" className="rounded-lg border px-3 py-2 text-sm"/><input required name="type" placeholder="Tür (Monitör, telefon…)" className="rounded-lg border px-3 py-2 text-sm"/><input name="brand" placeholder="Marka" className="rounded-lg border px-3 py-2 text-sm"/><input name="model" placeholder="Model" className="rounded-lg border px-3 py-2 text-sm"/><input name="serialNumber" placeholder="Seri numarası" className="rounded-lg border px-3 py-2 text-sm"/><button className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white">Demirbaş ekle</button><input name="location" placeholder="Konum / kat" className="rounded-lg border px-3 py-2 text-sm md:col-span-2"/></form>
    <div className="grid gap-3 lg:grid-cols-2">{assets.map(asset => { const active = asset.assignments[0]; return <article key={asset.id} className="rounded-xl border bg-card p-4"><div className="flex items-start justify-between gap-3"><div><strong>{asset.type} · {asset.brand || "Marka yok"} {asset.model || ""}</strong><p className="text-sm text-muted-foreground">{asset.assetTag} · Seri: {asset.serialNumber || "—"}</p></div><span className={`rounded-full px-2 py-1 text-xs font-semibold ${active ? "bg-blue-50 text-blue-700" : "bg-emerald-50 text-emerald-700"}`}>{active ? "Zimmetli" : "Stokta"}</span></div>{active ? <div className="mt-4 flex items-center justify-between rounded-lg bg-muted/50 p-3"><div><small className="block text-muted-foreground">Teslim edilen</small><b className="text-sm">{active.user.name || active.user.email}</b><p className="text-xs text-muted-foreground">{active.user.title || "Ünvan belirtilmemiş"}</p></div><form action={returnAsset}><input type="hidden" name="assignmentId" value={active.id}/><input type="hidden" name="assetId" value={asset.id}/><button className="rounded-lg border bg-background px-3 py-2 text-xs font-semibold">İade al</button></form></div> : <form action={assignAsset} className="mt-4 flex gap-2"><input type="hidden" name="assetId" value={asset.id}/><select required name="userId" className="min-w-0 flex-1 rounded-lg border px-3 py-2 text-sm"><option value="">Personel seçin</option>{users.map(u=><option key={u.id} value={u.id}>{u.name || u.email}</option>)}</select><button className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white">Zimmetle</button></form>}</article>; })}</div>
    {!assets.length && <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">Henüz demirbaş kaydı yok.</div>}
  </div>;
}

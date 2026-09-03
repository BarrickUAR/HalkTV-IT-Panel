import { createClient } from "@supabase/supabase-js";

// Varsayılan boş stringler veriyoruz ki hata fırlatmasın.
// Canlıya geçince kullanıcı bunları .env dosyasına girecek.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder-url.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-key";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Dosyayı Supabase Storage'a yükler.
 * @param file FormData'dan gelen File nesnesi
 * @param bucketName Supabase'deki bucket adı (örn: "attachments")
 * @returns Yüklenen dosyanın yolu (storagePath) veya null
 */
export async function uploadFileToSupabase(file: File, bucketName: string = "attachments"): Promise<string | null> {
  if (supabaseUrl.includes("placeholder-url")) {
    console.warn("Supabase bağlantısı henüz yapılmadı. Dosya yükleme simüle ediliyor.");
    return `mock-storage-path/${Date.now()}-${file.name}`;
  }

  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
  const filePath = `${fileName}`;

  const { data, error } = await supabase.storage
    .from(bucketName)
    .upload(filePath, file);

  if (error) {
    console.error("Supabase yükleme hatası:", error);
    return null;
  }

  return data.path;
}

/**
 * Supabase Storage'daki bir dosyanın indirme bağlantısını (public URL) getirir.
 */
export function getSupabaseFileUrl(path: string, bucketName: string = "attachments"): string {
  if (supabaseUrl.includes("placeholder-url")) {
    return "#mock-url";
  }
  const { data } = supabase.storage.from(bucketName).getPublicUrl(path);
  return data.publicUrl;
}

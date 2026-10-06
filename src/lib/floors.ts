export const SYSTEM_FLOORS = [
  "Giriş Kat",
  "1. Kat",
  "2. Kat",
  "3. Kat",
  "4. Kat",
  "5. Kat",
  "6. Kat",
  "7. Kat",
] as const;

export type SystemFloor = (typeof SYSTEM_FLOORS)[number];

/**
 * Kat metnindeki büyük harfli KAT kelimesini Kat olarak normalize eder
 */
export function formatFloor(floor?: string | null): string {
  if (!floor) return "";
  return floor.trim().replace(/\bKAT\b/g, "Kat");
}

/**
 * Kat sıralama değeri döndürür:
 * - -1, -2: Bodrum/Otopark katları (-1, -2)
 * - Giriş / Zemin / Lobi / 0: 0
 * - 1. Kat - 7. Kat: 1 - 7
 * - Diğer / Saha: 100
 * - Boş: 999
 */
export function getFloorOrder(floor?: string | null): number {
  if (!floor) return 999;
  const f = floor.toLowerCase().trim();
  if (f.includes("-2")) return -2;
  if (f.includes("-1")) return -1;
  if (f.includes("giriş") || f.includes("giris") || f.includes("zemin") || f.startsWith("0") || f.includes("lobi")) return 0;
  if (f.includes("1")) return 1;
  if (f.includes("2")) return 2;
  if (f.includes("3")) return 3;
  if (f.includes("4")) return 4;
  if (f.includes("5")) return 5;
  if (f.includes("6")) return 6;
  if (f.includes("7")) return 7;
  if (f.includes("8")) return 8;
  if (f.includes("9")) return 9;
  return 100;
}

/**
 * İki kat bilgisini sistem sırasına göre karşılaştırır:
 * Giriş Kat -> 1. Kat -> 2. Kat -> ... -> 7. Kat
 */
export function compareFloors(a?: string | null, b?: string | null): number {
  const orderA = getFloorOrder(a);
  const orderB = getFloorOrder(b);
  if (orderA !== orderB) return orderA - orderB;
  return (a || "").localeCompare(b || "", "tr", { numeric: true });
}

/**
 * Bir kullanıcının seçilen kat filtresiyle eşleşip eşleşmediğini kontrol eder
 */
export function matchesFloor(
  targetFloor: string,
  userFloor?: string | null,
  userFloorLabel?: string | null,
  userDept?: string | null
): boolean {
  if (!targetFloor || targetFloor === "ALL") return true;

  const t = targetFloor.toLowerCase().trim();
  const f = (userFloor || "").toLowerCase().trim();
  const fl = (userFloorLabel || "").toLowerCase().trim();
  const d = (userDept || "").toLowerCase().trim();

  // Tam veya içerme eşleşmesi
  if (f === t || fl === t || d === t) return true;
  if (f && (f.includes(t) || t.includes(f))) return true;
  if (fl && (fl.includes(t) || t.includes(fl))) return true;

  // Giriş / Zemin / 0 / Lobi kontrolü
  const isTargetGiris = t.includes("giriş") || t.includes("giris") || t.includes("zemin") || t.startsWith("0") || t.includes("lobi");
  const isUserGiris = f.includes("giriş") || f.includes("giris") || f.includes("zemin") || f.startsWith("0") || f.includes("lobi") || d.includes("lobi") || d.includes("danışma");
  if (isTargetGiris && isUserGiris) return true;

  // 1-9 arası numaralı kat kontrolü
  for (let n = 1; n <= 9; n++) {
    const numStr = String(n);
    const tHas = t.includes(numStr);
    const uHas = f.includes(numStr) || fl.includes(numStr);
    if (tHas && uHas) {
      const tNeg = t.includes("-" + numStr);
      const uNeg = f.includes("-" + numStr) || fl.includes("-" + numStr);
      if (tNeg === uNeg) return true;
    }
  }

  return false;
}

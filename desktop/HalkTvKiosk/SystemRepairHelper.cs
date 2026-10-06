using System;
using System.Diagnostics;
using System.IO;
using System.Windows.Forms;

namespace HalkTvClient;

public static class SystemRepairHelper
{
    public static bool FlushDns(out string message)
    {
        try
        {
            var psi = new ProcessStartInfo
            {
                FileName = "ipconfig",
                Arguments = "/flushdns",
                CreateNoWindow = true,
                UseShellExecute = false,
                RedirectStandardOutput = true
            };
            using var p = Process.Start(psi);
            if (p == null || !p.WaitForExit(4000) || p.ExitCode != 0)
            {
                message = "DNS önbelleği temizlenemedi. Yönetici yetkisini ve ağ yapılandırmasını kontrol edin.";
                return false;
            }
            message = "DNS önbelleği başarıyla temizlendi.";
            return true;
        }
        catch (Exception ex)
        {
            message = "DNS temizlenirken hata: " + ex.Message;
            return false;
        }
    }

    public static bool ResetPrintSpooler(out string message)
    {
        try
        {
            // Spooler servisini durdur, takılan işleri sil, servisi tekrar başlat
            string script = "Stop-Service -Name Spooler -Force -ErrorAction SilentlyContinue; " +
                           "Remove-Item -Path \"$env:SystemRoot\\System32\\spool\\PRINTERS\\*\" -Force -ErrorAction SilentlyContinue; " +
                           "Start-Service -Name Spooler -ErrorAction SilentlyContinue";

            var psi = new ProcessStartInfo
            {
                FileName = "powershell.exe",
                Arguments = $"-NoProfile -ExecutionPolicy Bypass -Command \"{script}\"",
                CreateNoWindow = true,
                UseShellExecute = false
            };
            using var p = Process.Start(psi);
            if (p == null || !p.WaitForExit(6000) || p.ExitCode != 0)
            {
                message = "Yazıcı kuyruğu sıfırlanamadı. Bu işlem için yönetici yetkisi gerekebilir.";
                return false;
            }
            message = "Yazıcı kuyruğu temizlendi ve spooler servisi yeniden başlatıldı.";
            return true;
        }
        catch (Exception ex)
        {
            message = "Yazıcı servisi sıfırlanırken hata: " + ex.Message;
            return false;
        }
    }

    public static bool RenewIp(out string message)
    {
        try
        {
            var psi = new ProcessStartInfo
            {
                FileName = "ipconfig",
                Arguments = "/renew",
                CreateNoWindow = true,
                UseShellExecute = false
            };
            using var p = Process.Start(psi);
            if (p == null || !p.WaitForExit(8000) || p.ExitCode != 0)
            {
                message = "IP adresi yenilenemedi. Ağ bağlantısını ve yönetici yetkisini kontrol edin.";
                return false;
            }
            message = "Ağ bağlantısı ve IP adresi başarıyla yenilendi.";
            return true;
        }
        catch (Exception ex)
        {
            message = "IP yenilenirken hata: " + ex.Message;
            return false;
        }
    }

    public static bool CopySystemSummaryToClipboard(out string summary)
    {
        try
        {
            var t = SystemTelemetry.Collect();
            summary = $"========================================\r\n" +
                      $"         HALKTV IT SİSTEM RAPORU        \r\n" +
                      $"========================================\r\n" +
                      $"Bilgisayar Adı  : {t.Hostname}\r\n" +
                      $"Kullanıcı Adı   : {t.Username}\r\n" +
                      $"IP Adresi       : {t.Ip}\r\n" +
                      $"İşlemci (CPU)   : {t.Cpu}\r\n" +
                      $"Ekran Kartı     : {t.Gpu}\r\n" +
                      $"RAM Bellek      : {Math.Round(t.RamUsedMb / 1024.0, 1)} / {Math.Round(t.RamTotalMb / 1024.0, 1)} GB\r\n" +
                      $"C: Disk Alanı   : {t.DiskFreeGb} GB Boş / {t.DiskTotalGb} GB Toplam\r\n" +
                      $"Ağ Bağlantısı   : {t.NetworkSpeed}\r\n" +
                      $"Monitör Durumu  : {t.ScreenCount}\r\n" +
                      $"İşletim Sistemi : {t.Os}\r\n" +
                      $"Açık Kalma Sür. : {t.Uptime}\r\n" +
                      $"Zaman           : {DateTime.Now:dd.MM.yyyy HH:mm:ss}\r\n" +
                      $"========================================";

            Clipboard.SetText(summary);
            return true;
        }
        catch (Exception ex)
        {
            summary = "Sistem raporu kopyalanırken hata: " + ex.Message;
            return false;
        }
    }
}

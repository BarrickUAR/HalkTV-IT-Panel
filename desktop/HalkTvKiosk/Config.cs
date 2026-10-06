using System;
using System.IO;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Security.Cryptography;
using System.Text;
using Microsoft.Win32;

namespace HalkTvClient;

public class AppConfig
{
    public string ServerUrl { get; set; } = "http://192.168.3.79:3000";
    [JsonIgnore] public string ApiSecret { get; set; } = "";
    public string DeviceId { get; set; } = "";
    [JsonIgnore] public string DeviceToken { get; set; } = "";
    public string ProtectedDeviceToken { get; set; } = "";
    public string ProtectedApiSecret { get; set; } = "";
    public bool AutoStartWithWindows { get; set; } = true;
}

public static class ConfigManager
{
    private static readonly string ConfigDir = Path.Combine(
        Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData),
        "HalkTvKiosk"
    );

    private static readonly string ConfigPath = Path.Combine(ConfigDir, "config.json");
    private const string RegistryRunKey = @"Software\Microsoft\Windows\CurrentVersion\Run";
    private const string AppName = "HalkTvKiosk";

    public static AppConfig Current { get; private set; } = new();

    public static void Load()
    {
        try
        {
            // Kullanıcıya ait güncel kayıt (cihaz tokenı ve sunucu değişikliği) her zaman önceliklidir.
            string localConfig = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "config.json");
            string pathToRead = File.Exists(ConfigPath) ? ConfigPath : localConfig;

            if (File.Exists(pathToRead))
            {
                string json = File.ReadAllText(pathToRead);
                var loaded = JsonSerializer.Deserialize<AppConfig>(json);
                if (loaded != null)
                {
                    using var document = JsonDocument.Parse(json);
                    loaded.DeviceToken = Unprotect(loaded.ProtectedDeviceToken);
                    loaded.ApiSecret = Unprotect(loaded.ProtectedApiSecret);
                    // One-time migration of older plaintext configuration.
                    if (string.IsNullOrEmpty(loaded.ProtectedDeviceToken) && document.RootElement.TryGetProperty("DeviceToken", out var oldToken)) loaded.DeviceToken = oldToken.GetString() ?? "";
                    if (string.IsNullOrEmpty(loaded.ProtectedApiSecret) && document.RootElement.TryGetProperty("ApiSecret", out var oldSecret)) loaded.ApiSecret = oldSecret.GetString() ?? "";
                    Current = loaded;
                    if (!string.IsNullOrWhiteSpace(Current.DeviceToken) && !string.IsNullOrWhiteSpace(Current.ApiSecret))
                    {
                        Current.ApiSecret = "";
                    }
                    Save();
                    return;
                }
            }
        }
        catch { }

        // Dosya yoksa varsayılanı kaydet
        Save();
    }

    private static string Unprotect(string value)
    {
        if (string.IsNullOrEmpty(value)) return "";
        try { return Encoding.UTF8.GetString(ProtectedData.Unprotect(Convert.FromBase64String(value), null, DataProtectionScope.CurrentUser)); }
        catch { ClientDiagnostics.Write("Kimlik", "Bu Windows kullanıcısında cihaz anahtarı çözülemedi; yeniden eşleştirme gerekli."); return ""; }
    }

    public static bool Save()
    {
        try
        {
            if (!Directory.Exists(ConfigDir))
            {
                Directory.CreateDirectory(ConfigDir);
            }

            var options = new JsonSerializerOptions { WriteIndented = true };
            Current.ProtectedDeviceToken = string.IsNullOrEmpty(Current.DeviceToken) ? "" : Convert.ToBase64String(ProtectedData.Protect(Encoding.UTF8.GetBytes(Current.DeviceToken), null, DataProtectionScope.CurrentUser));
            Current.ProtectedApiSecret = string.IsNullOrEmpty(Current.ApiSecret) ? "" : Convert.ToBase64String(ProtectedData.Protect(Encoding.UTF8.GetBytes(Current.ApiSecret), null, DataProtectionScope.CurrentUser));
            string json = JsonSerializer.Serialize(Current, options);
            File.WriteAllText(ConfigPath + ".tmp", json);
            File.Move(ConfigPath + ".tmp", ConfigPath, true);
            return true;
        }
        catch (Exception ex) { ClientDiagnostics.Write("Ayar kaydı", ex.GetType().Name); return false; }
    }

    public static void AddDeviceAuthentication(System.Net.Http.Headers.HttpRequestHeaders headers)
    {
        if (!string.IsNullOrWhiteSpace(Current.DeviceId) && !string.IsNullOrWhiteSpace(Current.DeviceToken))
        {
            headers.TryAddWithoutValidation("X-Device-Id", Current.DeviceId);
            headers.TryAddWithoutValidation("X-Device-Token", Current.DeviceToken);
        }
        else if (!string.IsNullOrWhiteSpace(Current.ApiSecret))
        {
            headers.TryAddWithoutValidation("X-Kiosk-Secret", Current.ApiSecret);
        }
    }

    public static bool IsAutoStartEnabled()
    {
        try
        {
            using var key = Registry.CurrentUser.OpenSubKey(RegistryRunKey, false);
            return key?.GetValue(AppName) != null;
        }
        catch
        {
            return false;
        }
    }

    public static void SetAutoStart(bool enable)
    {
        try
        {
            using var key = Registry.CurrentUser.OpenSubKey(RegistryRunKey, true);
            if (key == null) return;

            if (enable)
            {
                string exePath = Environment.ProcessPath ?? "";
                if (!string.IsNullOrEmpty(exePath))
                {
                    key.SetValue(AppName, $"\"{exePath}\"");
                    Current.AutoStartWithWindows = true;
                }
            }
            else
            {
                key.DeleteValue(AppName, false);
                Current.AutoStartWithWindows = false;
            }
            Save();
        }
        catch { }
    }
}

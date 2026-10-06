using System;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Net.NetworkInformation;
using System.Runtime.InteropServices;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using System.Windows.Forms;
using Microsoft.Win32;
using System.Reflection;

namespace HalkTvClient;

public class TelemetryData
{
    public string Hostname { get; set; } = "";
    public string Username { get; set; } = "";
    public string Ip { get; set; } = "";
    public string Os { get; set; } = "";
    public string Cpu { get; set; } = "";
    public string Gpu { get; set; } = "";
    public string NetworkSpeed { get; set; } = "";
    public string ScreenCount { get; set; } = "";
    public double DiskFreeGb { get; set; }
    public double DiskTotalGb { get; set; }
    public int RamUsedMb { get; set; }
    public int RamTotalMb { get; set; }
    public string Uptime { get; set; } = "";
    public int IdleSeconds { get; set; }
    public string KioskVersion { get; set; } = "";
    public string AnyDeskId { get; set; } = "";
    public bool TightVncAvailable { get; set; }
}

public static class SystemTelemetry
{
    private sealed class EnrollmentResponse
    {
        public bool Ok { get; set; }
        public string? DeviceId { get; set; }
        public string? DeviceToken { get; set; }
    }
    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Auto)]
    private class MEMORYSTATUSEX
    {
        public uint dwLength;
        public uint dwMemoryLoad;
        public ulong ullTotalPhys;
        public ulong ullAvailPhys;
        public ulong ullTotalPageFile;
        public ulong ullAvailPageFile;
        public ulong ullTotalVirtual;
        public ulong ullAvailVirtual;
        public ulong ullAvailExtendedVirtual;

        public MEMORYSTATUSEX()
        {
            dwLength = (uint)Marshal.SizeOf(typeof(MEMORYSTATUSEX));
        }
    }

    [DllImport("kernel32.dll", CharSet = CharSet.Auto, SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static extern bool GlobalMemoryStatusEx([In, Out] MEMORYSTATUSEX lpBuffer);

    private static readonly HttpClient _httpClient = new HttpClient { Timeout = TimeSpan.FromSeconds(8) };
    private static readonly SemaphoreSlim HeartbeatLock = new(1, 1);

    public static TelemetryData Collect()
    {
        var data = new TelemetryData
        {
            Hostname = NetworkHelper.GetHostname(),
            Username = NetworkHelper.GetUsername(),
            KioskVersion = Assembly.GetExecutingAssembly().GetName().Version?.ToString() ?? "unknown",
            AnyDeskId = KioskForm.GetAnyDeskId(),
            TightVncAvailable = File.Exists(@"C:\Program Files\TightVNC\tvnserver.exe") || File.Exists(@"C:\Program Files (x86)\TightVNC\tvnserver.exe")
        };

        var (ip, _) = NetworkHelper.DetectLocalNetwork();
        data.Ip = ip;

        // CPU Model
        data.Cpu = GetCpuModel();

        // GPU Model
        data.Gpu = GetGpuModel();

        // Network Speed & Type
        data.NetworkSpeed = GetNetworkSpeed();

        // Screen Count & Resolutions
        data.ScreenCount = GetScreenInfo();

        // Disk (C:)
        try
        {
            var drive = new DriveInfo("C");
            if (drive.IsReady)
            {
                data.DiskFreeGb = Math.Round((double)drive.AvailableFreeSpace / (1024 * 1024 * 1024), 1);
                data.DiskTotalGb = Math.Round((double)drive.TotalSize / (1024 * 1024 * 1024), 1);
            }
        }
        catch { }

        // RAM
        try
        {
            var mem = new MEMORYSTATUSEX();
            if (GlobalMemoryStatusEx(mem))
            {
                data.RamTotalMb = (int)(mem.ullTotalPhys / (1024 * 1024));
                int availMb = (int)(mem.ullAvailPhys / (1024 * 1024));
                data.RamUsedMb = Math.Max(0, data.RamTotalMb - availMb);
            }
        }
        catch { }

        // Uptime
        try
        {
            var ts = TimeSpan.FromMilliseconds(Environment.TickCount64);
            data.Uptime = ts.Days > 0 ? $"{ts.Days}g {ts.Hours}s" : $"{ts.Hours}s {ts.Minutes}d";
        }
        catch { }

        // Windows Version
        try
        {
            data.Os = GetWindowsVersionFriendly();
        }
        catch
        {
            data.Os = Environment.OSVersion.VersionString;
        }

        // Boşta kalma süresi (son mouse/klavye aktivitesinden bu yana)
        try
        {
            data.IdleSeconds = IdleDetector.GetIdleSeconds();
        }
        catch { }

        return data;
    }

    private static string GetCpuModel()
    {
        try
        {
            using var key = Registry.LocalMachine.OpenSubKey(@"HARDWARE\DESCRIPTION\System\CentralProcessor\0");
            string? name = key?.GetValue("ProcessorNameString")?.ToString();
            if (!string.IsNullOrWhiteSpace(name))
            {
                return string.Join(" ", name.Split(new[] { ' ' }, StringSplitOptions.RemoveEmptyEntries));
            }
        }
        catch { }
        return Environment.GetEnvironmentVariable("PROCESSOR_IDENTIFIER") ?? "-";
    }

    private static string GetGpuModel()
    {
        try
        {
            using var baseKey = Registry.LocalMachine.OpenSubKey(@"SYSTEM\CurrentControlSet\Control\Class\{4d36e968-e325-11ce-bfc1-08002be10318}");
            if (baseKey != null)
            {
                foreach (string subName in baseKey.GetSubKeyNames())
                {
                    if (subName.Length == 4 && char.IsDigit(subName[0]))
                    {
                        using var sub = baseKey.OpenSubKey(subName);
                        string? desc = sub?.GetValue("DriverDesc")?.ToString();
                        if (!string.IsNullOrWhiteSpace(desc) &&
                            !desc.Contains("Basic Display", StringComparison.OrdinalIgnoreCase) &&
                            !desc.Contains("Remote", StringComparison.OrdinalIgnoreCase))
                        {
                            return desc;
                        }
                    }
                }
            }
        }
        catch { }
        return "-";
    }

    private static string GetNetworkSpeed()
    {
        try
        {
            foreach (var ni in NetworkInterface.GetAllNetworkInterfaces())
            {
                if (ni.OperationalStatus == OperationalStatus.Up &&
                    (ni.NetworkInterfaceType == NetworkInterfaceType.Ethernet ||
                     ni.NetworkInterfaceType == NetworkInterfaceType.Wireless80211))
                {
                    long speedBps = ni.Speed;
                    string typeStr = ni.NetworkInterfaceType == NetworkInterfaceType.Wireless80211 ? "Wi-Fi" : "Kablolu";
                    if (speedBps >= 1_000_000_000)
                    {
                        return $"{speedBps / 1_000_000_000} Gbps {typeStr}";
                    }
                    if (speedBps > 0)
                    {
                        return $"{speedBps / 1_000_000} Mbps {typeStr}";
                    }
                    return typeStr;
                }
            }
        }
        catch { }
        return "-";
    }

    private static string GetScreenInfo()
    {
        try
        {
            var screens = Screen.AllScreens;
            if (screens.Length == 1)
            {
                return $"1 Monitör ({screens[0].Bounds.Width}x{screens[0].Bounds.Height})";
            }
            return $"{screens.Length} Monitör ({string.Join(", ", screens.Select(s => $"{s.Bounds.Width}x{s.Bounds.Height}"))})";
        }
        catch { }
        return "1 Monitör";
    }

    private static string GetWindowsVersionFriendly()
    {
        try
        {
            using var key = Registry.LocalMachine.OpenSubKey(@"SOFTWARE\Microsoft\Windows NT\CurrentVersion");
            if (key != null)
            {
                string? productName = key.GetValue("ProductName")?.ToString();
                string? displayVersion = key.GetValue("DisplayVersion")?.ToString();
                string? currentBuild = key.GetValue("CurrentBuild")?.ToString();

                if (int.TryParse(currentBuild, out int buildNum) && buildNum >= 22000)
                {
                    productName = productName?.Replace("Windows 10", "Windows 11") ?? "Windows 11";
                }

                if (!string.IsNullOrEmpty(displayVersion))
                {
                    return $"{productName} ({displayVersion})";
                }
                if (!string.IsNullOrEmpty(currentBuild))
                {
                    return $"{productName} (Build {currentBuild})";
                }
                if (!string.IsNullOrEmpty(productName))
                {
                    return productName;
                }
            }
        }
        catch { }
        return Environment.OSVersion.VersionString;
    }

    public static async Task SendHeartbeatAsync(string serverUrl)
    {
        if (!await HeartbeatLock.WaitAsync(0)) return;
        try
        {
            var telemetry = await Task.Run(Collect);
            await EnsureDeviceEnrollmentAsync(serverUrl, telemetry.Hostname);
            if (!string.Equals(serverUrl, ConfigManager.Current.ServerUrl, StringComparison.OrdinalIgnoreCase)) return;
            string endpoint = $"{serverUrl.TrimEnd('/')}/api/kiosk-heartbeat";

            string json = JsonSerializer.Serialize(telemetry);
            using var content = new StringContent(json, Encoding.UTF8, "application/json");

            using var request = new HttpRequestMessage(HttpMethod.Post, endpoint);
            request.Content = content;
            ConfigManager.AddDeviceAuthentication(request.Headers);

            using var response = await _httpClient.SendAsync(request);
            if (!response.IsSuccessStatusCode) ClientDiagnostics.Write("Cihaz bildirimi", $"HTTP {(int)response.StatusCode}; {(response.StatusCode == System.Net.HttpStatusCode.Unauthorized ? "Cihaz eşleştirmesini kontrol edin." : "Sunucu bağlantısını kontrol edin.")}");
        }
        catch (Exception ex) { ClientDiagnostics.Write("Cihaz bildirimi", ex.GetType().Name); }
        finally { HeartbeatLock.Release(); }
    }

    private static async Task EnsureDeviceEnrollmentAsync(string serverUrl, string hostname)
    {
        if (!string.IsNullOrWhiteSpace(ConfigManager.Current.DeviceId) && !string.IsNullOrWhiteSpace(ConfigManager.Current.DeviceToken)) return;
        if (string.IsNullOrWhiteSpace(ConfigManager.Current.ApiSecret)) return;
        try
        {
            string endpoint = $"{serverUrl.TrimEnd('/')}/api/device-enroll";
            using var request = new HttpRequestMessage(HttpMethod.Post, endpoint);
            request.Headers.TryAddWithoutValidation("X-Kiosk-Secret", ConfigManager.Current.ApiSecret);
            request.Content = new StringContent(JsonSerializer.Serialize(new { hostname }), Encoding.UTF8, "application/json");
            using var response = await _httpClient.SendAsync(request);
            if (!response.IsSuccessStatusCode) return;
            var enrollment = JsonSerializer.Deserialize<EnrollmentResponse>(await response.Content.ReadAsStringAsync(), new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
            if (enrollment?.Ok == true && !string.IsNullOrWhiteSpace(enrollment.DeviceId) && !string.IsNullOrWhiteSpace(enrollment.DeviceToken))
            {
                ConfigManager.Current.DeviceId = enrollment.DeviceId;
                ConfigManager.Current.DeviceToken = enrollment.DeviceToken;
                ConfigManager.Current.ApiSecret = "";
                ConfigManager.Save();
            }
        }
        catch { }
    }
}

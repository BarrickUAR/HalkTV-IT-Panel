using System;
using System.Diagnostics;
using System.Drawing;
using System.Drawing.Imaging;
using System.IO;
using System.Net.Http;
using System.Net.NetworkInformation;
using System.Runtime.InteropServices;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using System.Windows.Forms;
using Microsoft.Win32;

namespace HalkTvClient;

/// <summary>
/// IT yöneticisinden gelen uzaktan komutları ve süreç izlemeyi yönetir.
/// Her 30 saniyede sunucudan komut sorgular ve çalıştırır.
/// Sistem olaylarını (boot, kapanma, kilit vs.) loglar.
/// Kritik süreçleri izler, çöküş varsa sunucuya bildirir.
/// </summary>
public class RemoteCommandService : IDisposable
{
    [DllImport("user32.dll")]
    private static extern bool LockWorkStation();

    [DllImport("user32.dll")]
    private static extern int SendMessage(IntPtr hWnd, int wMsg, IntPtr wParam, IntPtr lParam);

    [DllImport("winmm.dll")]
    private static extern int waveOutSetVolume(IntPtr hwo, uint dwVolume);

    [DllImport("winmm.dll")]
    private static extern int waveOutGetVolume(IntPtr hwo, out uint pdwVolume);

    private const int WM_SYSCOMMAND = 0x0112;
    private const int SC_MONITORPOWER = 0xF170;
    private const int MONITOR_OFF = 2;

    private readonly string _serverUrl;
    private readonly NotifyIcon _trayIcon;
    private readonly KioskForm _kioskForm;
    private readonly HttpClient _http;

    private System.Windows.Forms.Timer? _commandPollTimer;
    private System.Windows.Forms.Timer? _processMonitorTimer;

    private uint _lastVolumeLevel = 0x80008000; // 50% - önceki ses seviyesi

    // Kritik süreçler: Ad → Bildirilebilir mi?
    private readonly System.Collections.Generic.Dictionary<string, bool> _watchedProcesses = new()
    {
        { "vsrx", true },
        { "xpression", true },
        { "playout", true },
        { "marsis", true },
    };

    private readonly System.Collections.Generic.HashSet<string> _runningProcessAlerts = new();

    public RemoteCommandService(string serverUrl, NotifyIcon trayIcon, KioskForm kioskForm)
    {
        _serverUrl = serverUrl.TrimEnd('/');
        _trayIcon = trayIcon;
        _kioskForm = kioskForm;
        _http = new HttpClient { Timeout = TimeSpan.FromSeconds(10) };
    }

    public void Start()
    {
        // 30sn'de bir komut sorgula
        _commandPollTimer = new System.Windows.Forms.Timer { Interval = 30000 };
        _commandPollTimer.Tick += async (s, e) => await PollAndExecuteCommandsAsync();
        _commandPollTimer.Start();

        // İlk sorguyu 5sn geciktirerek yap (uygulama hazırlanırken)
        var startDelay = new System.Windows.Forms.Timer { Interval = 5000 };
        startDelay.Tick += async (s, e) =>
        {
            startDelay.Stop();
            startDelay.Dispose();
            await PollAndExecuteCommandsAsync();
        };
        startDelay.Start();

        // 60sn'de bir kritik süreçleri izle
        _processMonitorTimer = new System.Windows.Forms.Timer { Interval = 60000 };
        _processMonitorTimer.Tick += async (s, e) => await MonitorCriticalProcessesAsync();
        _processMonitorTimer.Start();

        // Sistem olaylarını dinle (kilit açma/kapama vs.)
        SystemEvents.SessionSwitch += OnSessionSwitch;
        SystemEvents.PowerModeChanged += OnPowerModeChanged;

        // Boot event'ini gönder
        _ = SendSystemEventAsync("BOOT", $"Kiosk başlatıldı. Kullanıcı: {NetworkHelper.GetUsername()}");
    }

    public void Stop()
    {
        _commandPollTimer?.Stop();
        _processMonitorTimer?.Stop();
        SystemEvents.SessionSwitch -= OnSessionSwitch;
        SystemEvents.PowerModeChanged -= OnPowerModeChanged;
        _ = SendSystemEventAsync("SHUTDOWN", "Kiosk uygulaması kapatıldı.");
    }

    // ===== Komut Sorgulama & Çalıştırma =====

    private async Task PollAndExecuteCommandsAsync()
    {
        try
        {
            string hostname = NetworkHelper.GetHostname();
            string url = $"{ConfigManager.Current.ServerUrl.TrimEnd('/')}/api/device-commands?hostname={Uri.EscapeDataString(hostname)}";
            using var request = new HttpRequestMessage(HttpMethod.Get, url);
            ConfigManager.AddDeviceAuthentication(request.Headers);
            var response = await _http.SendAsync(request);
            if (!response.IsSuccessStatusCode) return;

            string json = await response.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(json);
            if (!doc.RootElement.TryGetProperty("commands", out var commandsEl)) return;

            foreach (var cmd in commandsEl.EnumerateArray())
            {
                string id = cmd.GetProperty("id").GetString() ?? "";
                string type = cmd.GetProperty("type").GetString() ?? "";
                string payload = cmd.TryGetProperty("payload", out var p) ? p.GetString() ?? "" : "";

                _ = ExecuteCommandAsync(id, type, payload);
            }
        }
        catch { }
    }

    private async Task ExecuteCommandAsync(string commandId, string type, string payload)
    {
        string result = "OK";
        bool success = true;

        try
        {
            await ReportCommandStatusAsync(commandId, "EXECUTING", null);

            switch (type)
            {
                case "RESTART":
                    _trayIcon.ShowBalloonTip(5000, "⚠️ Yeniden Başlatma", "Bilgisayar 30 saniye içinde yeniden başlatılacak. (IT komutu)", ToolTipIcon.Warning);
                    await Task.Delay(2000);
                    Process.Start(new ProcessStartInfo("shutdown", "/r /t 30 /c \"HalkTV IT: Uzak yeniden başlatma komutu\"") { CreateNoWindow = true, UseShellExecute = false });
                    result = "Yeniden başlatma komutu gönderildi.";
                    break;

                case "SHUTDOWN":
                    _trayIcon.ShowBalloonTip(5000, "⚠️ Kapatma", "Bilgisayar 30 saniye içinde kapatılacak. (IT komutu)", ToolTipIcon.Warning);
                    await Task.Delay(2000);
                    Process.Start(new ProcessStartInfo("shutdown", "/s /t 30 /c \"HalkTV IT: Uzak kapatma komutu\"") { CreateNoWindow = true, UseShellExecute = false });
                    result = "Kapatma komutu gönderildi.";
                    break;

                case "RELOAD_KIOSK":
                    _kioskForm.Invoke(() => _kioskForm.ReloadKiosk());
                    _trayIcon.ShowBalloonTip(3000, "🔄 Kiosk Yenilendi", "IT tarafından kiosk yenilendi.", ToolTipIcon.Info);
                    result = "Kiosk yenilendi.";
                    break;

                case "LOCK_SCREEN":
                    LockWorkStation();
                    result = "Ekran kilitlendi.";
                    break;

                case "SHOW_MESSAGE":
                    string msg = string.IsNullOrEmpty(payload) ? "IT'den bir mesaj var." : payload;
                    _trayIcon.ShowBalloonTip(10000, "📢 IT Bildirimi", msg, ToolTipIcon.Info);
                    _kioskForm.Invoke(() => _kioskForm.Show());
                    result = $"Mesaj gösterildi: {msg}";
                    break;

                case "FLUSH_DNS":
                    SystemRepairHelper.FlushDns(out string dnsMsg);
                    _trayIcon.ShowBalloonTip(3000, "🧹 DNS Temizlendi", dnsMsg, ToolTipIcon.Info);
                    result = dnsMsg;
                    break;

                case "RESET_SPOOLER":
                    SystemRepairHelper.ResetPrintSpooler(out string spoolMsg);
                    _trayIcon.ShowBalloonTip(3000, "🖨️ Spooler Sıfırlandı", spoolMsg, ToolTipIcon.Info);
                    result = spoolMsg;
                    break;

                case "RENEW_IP":
                    SystemRepairHelper.RenewIp(out string ipMsg);
                    _trayIcon.ShowBalloonTip(3000, "🔄 IP Yenilendi", ipMsg, ToolTipIcon.Info);
                    result = ipMsg;
                    break;

                case "OPEN_APP":
                    if (!string.IsNullOrEmpty(payload))
                    {
                        Process.Start(new ProcessStartInfo(payload) { UseShellExecute = true });
                        result = $"Uygulama açıldı: {payload}";
                    }
                    break;

                case "MUTE_AUDIO":
                    waveOutGetVolume(IntPtr.Zero, out _lastVolumeLevel);
                    waveOutSetVolume(IntPtr.Zero, 0);
                    result = "Ses kapatıldı.";
                    break;

                case "UNMUTE_AUDIO":
                    waveOutSetVolume(IntPtr.Zero, _lastVolumeLevel);
                    result = "Ses açıldı.";
                    break;

                case "SLEEP":
                    Application.SetSuspendState(PowerState.Suspend, false, false);
                    result = "Uyku moduna alındı.";
                    break;

                case "TAKE_SCREENSHOT":
                    string screenshotResult = await TakeAndUploadScreenshotAsync();
                    result = screenshotResult;
                    break;

                case "KILL_PROCESS":
                    if (!string.IsNullOrEmpty(payload))
                    {
                        foreach (var proc in Process.GetProcessesByName(payload))
                        {
                            proc.Kill();
                        }
                        result = $"Süreç sonlandırıldı: {payload}";
                    }
                    break;

                default:
                    result = $"Bilinmeyen komut: {type}";
                    success = false;
                    break;
            }
        }
        catch (Exception ex)
        {
            result = $"Hata: {ex.Message}";
            success = false;
        }

        await ReportCommandStatusAsync(commandId, success ? "DONE" : "FAILED", result);
    }

    private async Task ReportCommandStatusAsync(string commandId, string status, string? result)
    {
        try
        {
            var body = new { commandId, status, result };
            string json = JsonSerializer.Serialize(body);
            using var content = new StringContent(json, Encoding.UTF8, "application/json");
            using var request = new HttpRequestMessage(HttpMethod.Post, $"{ConfigManager.Current.ServerUrl.TrimEnd('/')}/api/device-commands") { Content = content };
            ConfigManager.AddDeviceAuthentication(request.Headers);
            await _http.SendAsync(request);
        }
        catch { }
    }

    // ===== Ekran Görüntüsü =====

    private async Task<string> TakeAndUploadScreenshotAsync()
    {
        try
        {
            var screen = Screen.PrimaryScreen;
            if (screen == null) return "Ekran bulunamadı.";

            using var bmp = new Bitmap(screen.Bounds.Width, screen.Bounds.Height, PixelFormat.Format32bppArgb);
            using var g = Graphics.FromImage(bmp);
            g.CopyFromScreen(screen.Bounds.Location, Point.Empty, screen.Bounds.Size);

            using var ms = new MemoryStream();
            bmp.Save(ms, ImageFormat.Png);
            ms.Position = 0;

            string hostname = NetworkHelper.GetHostname();
            using var content = new MultipartFormDataContent();
            content.Add(new StreamContent(ms), "file", $"screenshot-{hostname}.png");
            content.Add(new StringContent(hostname), "hostname");

            using var request = new HttpRequestMessage(HttpMethod.Post, $"{ConfigManager.Current.ServerUrl.TrimEnd('/')}/api/screenshot") { Content = content };
            ConfigManager.AddDeviceAuthentication(request.Headers);
            var response = await _http.SendAsync(request);
            string responseBody = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode) return $"Ekran görüntüsü yüklenemedi: HTTP {(int)response.StatusCode}";

            _trayIcon.ShowBalloonTip(4000, "📸 Ekran Görüntüsü", "IT ekran görüntüsünüzü aldı.", ToolTipIcon.Info);
            return $"Ekran görüntüsü alındı: {responseBody}";
        }
        catch (Exception ex)
        {
            return $"Ekran görüntüsü hatası: {ex.Message}";
        }
    }

    // ===== Kritik Süreç İzleme =====

    private async Task MonitorCriticalProcessesAsync()
    {
        foreach (var kvp in _watchedProcesses)
        {
            string processName = kvp.Key;
            bool shouldAlert = kvp.Value;
            bool wasRunning = _runningProcessAlerts.Contains(processName);
            bool isRunning = Process.GetProcessesByName(processName).Length > 0;

            if (wasRunning && !isRunning)
            {
                // Süreç çöktü!
                _runningProcessAlerts.Remove(processName);
                if (shouldAlert)
                {
                    string detail = $"{processName} süreci çöktü veya kapandı!";
                    _trayIcon.ShowBalloonTip(8000, "🚨 Süreç Çöktü", detail, ToolTipIcon.Error);
                    await SendSystemEventAsync("PROCESS_CRASH", detail);
                }
            }
            else if (!wasRunning && isRunning)
            {
                _runningProcessAlerts.Add(processName);
            }
        }
    }

    // ===== Sistem Olayı Loglama =====

    private void OnSessionSwitch(object sender, SessionSwitchEventArgs e)
    {
        string eventType = e.Reason switch
        {
            SessionSwitchReason.SessionLock => "LOCK",
            SessionSwitchReason.SessionUnlock => "UNLOCK",
            SessionSwitchReason.SessionLogon => "LOGON",
            SessionSwitchReason.SessionLogoff => "LOGOFF",
            SessionSwitchReason.RemoteConnect => "REMOTE_CONNECT",
            SessionSwitchReason.RemoteDisconnect => "REMOTE_DISCONNECT",
            _ => e.Reason.ToString()
        };

        string detail = $"Kullanıcı: {NetworkHelper.GetUsername()} | Olay: {e.Reason}";
        _ = SendSystemEventAsync(eventType, detail);
    }

    private void OnPowerModeChanged(object sender, PowerModeChangedEventArgs e)
    {
        string eventType = e.Mode switch
        {
            PowerModes.Suspend => "SLEEP",
            PowerModes.Resume => "WAKE",
            _ => e.Mode.ToString()
        };

        _ = SendSystemEventAsync(eventType, $"Güç modu değişti: {e.Mode}");
    }

    public async Task SendSystemEventAsync(string eventType, string? detail = null)
    {
        try
        {
            var body = new
            {
                hostname = NetworkHelper.GetHostname(),
                eventType,
                detail
            };
            string json = JsonSerializer.Serialize(body);
            using var content = new StringContent(json, Encoding.UTF8, "application/json");
            using var request = new HttpRequestMessage(HttpMethod.Post, $"{ConfigManager.Current.ServerUrl.TrimEnd('/')}/api/system-events") { Content = content };
            ConfigManager.AddDeviceAuthentication(request.Headers);
            await _http.SendAsync(request);
        }
        catch { }
    }

    public void Dispose()
    {
        _commandPollTimer?.Dispose();
        _processMonitorTimer?.Dispose();
        _http.Dispose();
    }
}

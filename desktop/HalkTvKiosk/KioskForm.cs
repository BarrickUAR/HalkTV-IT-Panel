using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Net.Http;
using System.Runtime.InteropServices;
using System.Text.RegularExpressions;
using System.Text.Json;
using System.Windows.Forms;
using Microsoft.Win32;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

namespace HalkTvClient;

public class KioskForm : Form
{
    [DllImport("user32.dll", SetLastError = true)]
    private static extern bool RegisterHotKey(IntPtr hWnd, int id, uint fsModifiers, uint vk);

    [DllImport("user32.dll", SetLastError = true)]
    private static extern bool UnregisterHotKey(IntPtr hWnd, int id);

    [DllImport("user32.dll")]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static extern bool SetForegroundWindow(IntPtr hWnd);

    [DllImport("user32.dll")]
    private static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);

    private const int HOTKEY_ID = 9001;
    private const uint MOD_CONTROL = 0x0002;
    private const uint MOD_SHIFT = 0x0004;
    private const uint VK_H = 0x48;
    private const int WM_HOTKEY = 0x0312;

    private readonly WebView2 _webView;
    private readonly NotifyIcon _trayIcon;
    private bool _isInitialized = false;
    private AuthForm? _activeAuthForm = null;
    private System.Windows.Forms.Timer? _heartbeatTimer = null;
    private System.Windows.Forms.Timer? _sharedFolderTimer = null;
    private System.Windows.Forms.Timer? _reconnectTimer = null;
    private readonly HttpClient _healthClient = new() { Timeout = TimeSpan.FromSeconds(5) };
    private bool _reconnectInProgress;
    private Task<Dictionary<string, int?>>? _folderCountTask;
    private bool _folderRefreshInProgress;

    public const int KIOSK_WIDTH = 380;

    public KioskForm(NotifyIcon trayIcon)
    {
        _trayIcon = trayIcon;

        FormBorderStyle = FormBorderStyle.None;
        ShowInTaskbar = false;
        TopMost = true;
        StartPosition = FormStartPosition.Manual;
        DoubleBuffered = true;

        // 1px zarif dış çerçeve
        Padding = new Padding(1);
        BackColor = Color.FromArgb(203, 213, 225); // #cbd5e1

        _webView = new WebView2
        {
            Dock = DockStyle.Fill
        };
        Controls.Add(_webView);

        UpdateBoundsToTaskbar();
        InitializeWebView();
        StartHeartbeat();
    }

    protected override void OnHandleCreated(EventArgs e)
    {
        base.OnHandleCreated(e);
        try
        {
            // Global kısayol: Ctrl + Shift + H
            RegisterHotKey(Handle, HOTKEY_ID, MOD_CONTROL | MOD_SHIFT, VK_H);
        }
        catch { }
    }

    protected override void OnHandleDestroyed(EventArgs e)
    {
        try
        {
            UnregisterHotKey(Handle, HOTKEY_ID);
        }
        catch { }
        base.OnHandleDestroyed(e);
    }

    protected override void Dispose(bool disposing)
    {
        if (disposing) {
            _heartbeatTimer?.Dispose();
            _sharedFolderTimer?.Dispose();
            _reconnectTimer?.Dispose();
            _activeAuthForm?.Dispose();
            _healthClient.Dispose();
        }
        base.Dispose(disposing);
    }

    protected override void WndProc(ref Message m)
    {
        if (m.Msg == WM_HOTKEY && m.WParam.ToInt32() == HOTKEY_ID)
        {
            ToggleVisibility();
            return;
        }
        base.WndProc(ref m);
    }

    protected override void OnFormClosing(FormClosingEventArgs e)
    {
        if (e.CloseReason == CloseReason.UserClosing)
        {
            e.Cancel = true;
            try
            {
                var psi = new ProcessStartInfo("cmd.exe", "/c exit")
                {
                    Verb = "runas",
                    UseShellExecute = true,
                    WindowStyle = ProcessWindowStyle.Hidden
                };
                var proc = Process.Start(psi);
                if (proc != null)
                {
                    proc.WaitForExit();
                    Environment.Exit(0);
                }
            }
            catch { }
        }
    }

    protected override bool ProcessCmdKey(ref Message msg, Keys keyData)
    {
        if (keyData == (Keys.Alt | Keys.F4))
        {
            this.Close(); // Bu artık OnFormClosing'i tetikler
            return true;
        }
        return base.ProcessCmdKey(ref msg, keyData);
    }

    private void StartHeartbeat()
    {
        // Domain açılışında 100+ cihazın aynı milisaniyede sunucuya yüklenmesini önle.
        _heartbeatTimer = new System.Windows.Forms.Timer { Interval = Random.Shared.Next(3000, 15000) };
        _heartbeatTimer.Tick += async (s, e) =>
        {
            if (_heartbeatTimer != null) _heartbeatTimer.Interval = Random.Shared.Next(55000, 70000);
            await SystemTelemetry.SendHeartbeatAsync(ConfigManager.Current.ServerUrl);
        };
        _heartbeatTimer.Start();
    }

    public void UpdateBoundsToTaskbar()
    {
        var primaryScreen = Screen.PrimaryScreen;
        if (primaryScreen == null) return;

        Rectangle workArea = primaryScreen.WorkingArea;
        int height = Math.Min(800, Math.Max(560, workArea.Height));
        int x = workArea.X + workArea.Width - KIOSK_WIDTH;
        int y = workArea.Y + workArea.Height - height;

        SetBounds(x, y, KIOSK_WIDTH, height);
    }

    private async void InitializeWebView()
    {
        try
        {
            // Ortak Environment: AuthForm ile AYNI cookie deposunu ve oturumu kullanır!
            var env = await WebViewEnvironment.GetEnvironmentAsync();
            await _webView.EnsureCoreWebView2Async(env);

            _webView.CoreWebView2.Settings.UserAgent = WebViewEnvironment.UserAgent;
            _webView.CoreWebView2.Settings.IsStatusBarEnabled = false;
            _webView.CoreWebView2.Settings.AreDefaultContextMenusEnabled = false;

            string anyDeskId = "";
            string anyDeskJson = JsonSerializer.Serialize(anyDeskId);
            string sharedFolderCountsJson = "{}";
            string machineNameJson = JsonSerializer.Serialize(Environment.MachineName);
            var (bridgeLocalIp, _) = NetworkHelper.DetectLocalNetwork();
            string localIpJson = JsonSerializer.Serialize(bridgeLocalIp);
            string hasDeviceAuthJson = JsonSerializer.Serialize(!string.IsNullOrWhiteSpace(ConfigManager.Current.DeviceId) && !string.IsNullOrWhiteSpace(ConfigManager.Current.DeviceToken));

            // React Electron uyumluluk katmanı (Preload Script)
            string bridgeScript = @"
                window.isDotNetKiosk = true;
                window.__halktvKioskVisible = true;
                window.__halktvAnyDeskId = __ANYDESK_ID__;
                window.__halktvSharedFolderCounts = __SHARED_FOLDER_COUNTS__;
                window.__halktvHostname = __HOSTNAME__;
                window.__halktvLocalIp = __LOCAL_IP__;
                window.__halktvHasDeviceAuth = __HAS_DEVICE_AUTH__;
                window.require = function(mod) {
                    if (mod === 'electron') {
                        return {
                            ipcRenderer: {
                                send: function(channel, data) {
                                    try {
                                        window.chrome.webview.postMessage({ channel: channel, data: data });
                                    } catch(e) {}
                                },
                                invoke: async function(channel, data) {
                                    if (channel === 'get-network-info') {
                                        var p = new URLSearchParams(window.location.search);
                                        return { localIp: window.__halktvLocalIp || p.get('ip') || '127.0.0.1' };
                                    }
                                    if (channel === 'get-system-info') {
                                        var p = new URLSearchParams(window.location.search);
                                         return { hostname: p.get('hostname') || window.__halktvHostname || '—', username: p.get('username') || '—' };
                                    }
                                    if (channel === 'get-anydesk-id') return window.__halktvAnyDeskId || '';
                                    if (channel === 'get-shared-folder-counts') return window.__halktvSharedFolderCounts || {};
                                    if (channel === 'has-device-auth') return window.__halktvHasDeviceAuth === true;
                                    if (channel === 'is-kiosk-visible') return window.__halktvKioskVisible !== false;
                                    return null;
                                },
                                on: function(channel, listener) {
                                    window.addEventListener('kiosk-event-' + channel, function(e) {
                                        listener(e, e.detail);
                                    });
                                },
                                removeListener: function() {},
                                removeAllListeners: function() {}
                            }
                        };
                    }
                    return null;
                };
            ";
            bridgeScript = bridgeScript.Replace("__ANYDESK_ID__", anyDeskJson);
            bridgeScript = bridgeScript.Replace("__SHARED_FOLDER_COUNTS__", sharedFolderCountsJson);
            bridgeScript = bridgeScript.Replace("__HOSTNAME__", machineNameJson);
            bridgeScript = bridgeScript.Replace("__LOCAL_IP__", localIpJson);
            bridgeScript = bridgeScript.Replace("__HAS_DEVICE_AUTH__", hasDeviceAuthJson);
            await _webView.CoreWebView2.AddScriptToExecuteOnDocumentCreatedAsync(bridgeScript);

            _webView.CoreWebView2.WebMessageReceived += CoreWebView2_WebMessageReceived;
            _webView.CoreWebView2.AddWebResourceRequestedFilter(
                ConfigManager.Current.ServerUrl.TrimEnd('/') + "/api/*",
                CoreWebView2WebResourceContext.All,
                CoreWebView2WebResourceRequestSourceKinds.All);
            _webView.CoreWebView2.WebResourceRequested += (_, args) =>
            {
                if (!IsTrustedServerUri(args.Request.Uri)) return;
                string path = new Uri(args.Request.Uri).AbsolutePath;
                if (path != "/api/kiosk-session" && path != "/api/kiosk-events" && path != "/api/device-message/read" && path != "/api/device-chat") return;
                if (string.IsNullOrWhiteSpace(ConfigManager.Current.DeviceId) || string.IsNullOrWhiteSpace(ConfigManager.Current.DeviceToken)) return;
                args.Request.Headers.SetHeader("X-Device-Id", ConfigManager.Current.DeviceId);
                args.Request.Headers.SetHeader("X-Device-Token", ConfigManager.Current.DeviceToken);
            };
            _webView.CoreWebView2.NavigationStarting += CoreWebView2_NavigationStarting;
            _webView.CoreWebView2.NavigationCompleted += (_, args) =>
            {
                if (!IsTrustedServerUri(_webView.Source?.ToString() ?? "")) return;
                if (args.IsSuccess) { _reconnectTimer?.Stop(); _ = RefreshAnyDeskAsync(); _ = RefreshSharedFoldersAsync(); }
                else StartServerReconnect();
            };
            _webView.CoreWebView2.NewWindowRequested += CoreWebView2_NewWindowRequested;
            _webView.CoreWebView2.ProcessFailed += (s, args) =>
            {
                // Edge WebView2 motoru çökerse veya kapanırsa otomatik ayağa kaldır
                try { _webView.Reload(); } catch { StartServerReconnect(); }
            };

            _isInitialized = true;
            NavigateToKiosk();
            StartSharedFolderRefresh();
        }
        catch (Exception ex)
        {
            try
            {
                string logPath = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "HalkTvKiosk", "Logs", "startup.log");
                File.AppendAllText(logPath, $"[{DateTime.Now}] Kiosk initialization failed: {ex}\n");
            }
            catch { }
            MessageBox.Show("Kiosk başlatılamadı: " + ex.Message, "Hata", MessageBoxButtons.OK, MessageBoxIcon.Error);
        }
    }

    public void NavigateToKiosk()
    {
        if (!_isInitialized) return;

        string hostname = Uri.EscapeDataString(NetworkHelper.GetHostname());
        string username = Uri.EscapeDataString(NetworkHelper.GetUsername());
        var (ip, _) = NetworkHelper.DetectLocalNetwork();
        string safeIp = Uri.EscapeDataString(ip);

        string baseServer = ConfigManager.Current.ServerUrl.TrimEnd('/');
        // WebView2 eski kiosk JS/CSS önbelleğini kullanmasın; her açılışta güncel UI alınır.
        string cacheBust = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds().ToString();
        string url = $"{baseServer}/kiosk?hostname={hostname}&username={username}&ip={safeIp}&ui={cacheBust}";

        _webView.Source = new Uri(url);
    }

    public void ReloadKiosk()
    {
        if (_isInitialized)
        {
            _webView.Reload();
        }
    }

    private void StartServerReconnect()
    {
        if (_reconnectTimer == null)
        {
            _reconnectTimer = new System.Windows.Forms.Timer { Interval = 15000 };
            _reconnectTimer.Tick += async (_, _) =>
            {
                if (_reconnectInProgress) return;
                _reconnectInProgress = true;
                try
                {
                    string healthUrl = ConfigManager.Current.ServerUrl.TrimEnd('/') + "/api/health";
                    using var response = await _healthClient.GetAsync(healthUrl);
                    if (response.IsSuccessStatusCode)
                    {
                        _reconnectTimer?.Stop();
                        NavigateToKiosk();
                    }
                }
                catch { }
                finally { _reconnectInProgress = false; }
            };
        }
        _reconnectTimer.Start();
    }

    private void StartSharedFolderRefresh()
    {
        _sharedFolderTimer?.Stop();
        _sharedFolderTimer?.Dispose();
        _sharedFolderTimer = new System.Windows.Forms.Timer { Interval = 120000 };
        _sharedFolderTimer.Tick += async (_, _) => await RefreshSharedFoldersAsync();
        _sharedFolderTimer.Start();
    }

    private async Task RefreshSharedFoldersAsync()
    {
        if (_folderRefreshInProgress || IsDisposed) return;
        _folderRefreshInProgress = true;
        try {
            // A stalled SMB operation must not block startup or create more workers each tick.
            _folderCountTask ??= Task.Run(GetSharedFolderCounts);
            var counts = await _folderCountTask.WaitAsync(TimeSpan.FromSeconds(5));
            _folderCountTask = null;
            if (IsDisposed || _webView.CoreWebView2 == null) return;
            string json = JsonSerializer.Serialize(counts);
            await _webView.CoreWebView2.ExecuteScriptAsync($"window.__halktvSharedFolderCounts={json};window.dispatchEvent(new CustomEvent('kiosk-event-shared-folder-counts',{{detail:{json}}}));");
        }
        catch (TimeoutException) { ClientDiagnostics.Write("Ortak klasör", "Dosya sayımı zaman aşımı; arayüz kullanılabilir."); }
        catch (Exception ex) { ClientDiagnostics.Write("Ortak klasör", ex.GetType().Name); }
        finally { _folderRefreshInProgress = false; }
    }

    private async Task RefreshAnyDeskAsync()
    {
        try {
            string id = await Task.Run(GetAnyDeskId);
            if (IsDisposed || _webView.CoreWebView2 == null) return;
            string json = JsonSerializer.Serialize(id);
            await _webView.CoreWebView2.ExecuteScriptAsync($"window.__halktvAnyDeskId={json};window.dispatchEvent(new CustomEvent('kiosk-event-anydesk-id',{{detail:{json}}}));");
        }
        catch (Exception ex) { ClientDiagnostics.Write("AnyDesk", ex.GetType().Name); }
    }

    public void ToggleVisibility()
    {
        if (Visible)
        {
            Hide();
            SetWebVisibility(false);
        }
        else
        {
            UpdateBoundsToTaskbar();
            Show();
            TopMost = true;
            Activate();
            _webView.Focus();
            SetWebVisibility(true);
        }
    }

    private void CoreWebView2_WebMessageReceived(object? sender, CoreWebView2WebMessageReceivedEventArgs e)
    {
        try
        {
            if (!IsTrustedServerUri(e.Source)) return;
            string raw = e.WebMessageAsJson;
            using var doc = JsonDocument.Parse(raw);
            var root = doc.RootElement;

            string channel = "";
            if (root.TryGetProperty("channel", out var chProp))
            {
                channel = chProp.GetString() ?? "";
            }

            JsonElement dataElement = default;
            if (!root.TryGetProperty("data", out dataElement))
            {
                root.TryGetProperty("payload", out dataElement);
            }

            HandleKioskMessage(channel, dataElement);
        }
        catch { }
    }

    private void HandleKioskMessage(string channel, JsonElement data)
    {
        switch (channel)
        {
            case "kiosk-minimize":
                Hide();
                SetWebVisibility(false);
                break;

            case "kiosk-popup":
                this.Invoke((MethodInvoker)delegate {
                    if (!Visible)
                    {
                        Show();
                    }
                    if (WindowState == FormWindowState.Minimized)
                    {
                        ShowWindow(this.Handle, 9); // SW_RESTORE
                    }
                    BringToFront();
                    Activate();
                    TopMost = true;
                    SetForegroundWindow(this.Handle);
                    TopMost = false;
                    SetWebVisibility(true);
                });
                break;

            case "kiosk-request-logout":
                this.Invoke((MethodInvoker)delegate {
                    _webView.CoreWebView2.PostWebMessageAsJson("{\"channel\":\"logout-approved\"}");
                });
                break;

            case "save-device-auth":
                if (data.ValueKind == JsonValueKind.Object &&
                    data.TryGetProperty("deviceId", out var deviceIdElement) &&
                    data.TryGetProperty("deviceToken", out var deviceTokenElement))
                {
                    string deviceId = deviceIdElement.GetString() ?? "";
                    string deviceToken = deviceTokenElement.GetString() ?? "";
                    if (!string.IsNullOrWhiteSpace(deviceId) && !string.IsNullOrWhiteSpace(deviceToken))
                    {
                        ConfigManager.Current.DeviceId = deviceId;
                        ConfigManager.Current.DeviceToken = deviceToken;
                        ConfigManager.Current.ApiSecret = "";
                        ConfigManager.Save();
                        _ = _webView.CoreWebView2.ExecuteScriptAsync("window.__halktvHasDeviceAuth=true;");
                        // Yeni cihaz kimliği alınır alınmaz merkezi envanter ve log akışını başlat.
                        _ = SystemTelemetry.SendHeartbeatAsync(ConfigManager.Current.ServerUrl);
                    }
                }
                break;

            case "kiosk-connect-marsis":
                OpenMarsisDirect();
                break;

            case "kiosk-connect-printers":
                try { Process.Start(new ProcessStartInfo("control", "printers") { UseShellExecute = true }); }
                catch { Process.Start(new ProcessStartInfo("ms-settings:printers") { UseShellExecute = true }); }
                break;

            case "kiosk-connect-network":
                try { Process.Start(new ProcessStartInfo("ncpa.cpl") { UseShellExecute = true }); }
                catch { Process.Start(new ProcessStartInfo("ms-settings:network") { UseShellExecute = true }); }
                break;

            case "launch-tightvnc":
                string vncIp = "";
                string connectionId = "";
                if (data.ValueKind == JsonValueKind.Object && data.TryGetProperty("ip", out var ipEl))
                {
                    vncIp = ipEl.GetString() ?? "";
                }
                if (data.ValueKind == JsonValueKind.Object && data.TryGetProperty("connectionId", out var connectionEl))
                {
                    connectionId = connectionEl.GetString() ?? "";
                }
                if (!string.IsNullOrEmpty(vncIp))
                {
                    Task.Run(() => {
                        try
                        {
                            string vncPath = @"C:\Program Files\TightVNC\tvnviewer.exe";
                            if (!System.IO.File.Exists(vncPath)) vncPath = @"C:\Program Files (x86)\TightVNC\tvnviewer.exe";
                            if (System.IO.File.Exists(vncPath))
                            {
                                Process? process = Process.Start(new ProcessStartInfo(vncPath, vncIp) { UseShellExecute = true });
                                SendWebEvent("vnc-launch-result", new { connectionId, success = process != null, error = process == null ? "TightVNC Viewer işlemi başlatılamadı." : (string?)null });
                            }
                            else
                            {
                                SendWebEvent("vnc-launch-result", new { connectionId, success = false, error = "TightVNC Viewer cihazda bulunamadı." });
                                this.Invoke((MethodInvoker)delegate {
                                    MessageBox.Show(this, "TightVNC Viewer bulunamadı. Lütfen cihazda tvnviewer.exe yüklü olduğundan emin olun.", "Hata", MessageBoxButtons.OK, MessageBoxIcon.Error);
                                });
                            }
                        }
                        catch (Exception ex)
                        {
                            SendWebEvent("vnc-launch-result", new { connectionId, success = false, error = ex.Message });
                            this.Invoke((MethodInvoker)delegate {
                                MessageBox.Show(this, "VNC Başlatılırken hata oluştu:\n" + ex.Message, "Hata", MessageBoxButtons.OK, MessageBoxIcon.Error);
                            });
                        }
                    });
                }
                break;

            case "kiosk-google-login":
                OpenGoogleAuthPopup();
                break;

            case "kiosk-open-auth":
                string authUrl = data.ValueKind == JsonValueKind.String ? data.GetString() ?? "" : "";
                if (!string.IsNullOrEmpty(authUrl))
                {
                    OpenGoogleAuthPopup(authUrl);
                }
                break;

            case "open-external":
                string extUrl = data.ValueKind == JsonValueKind.String ? data.GetString() ?? "" : "";
                if (!string.IsNullOrEmpty(extUrl))
                {
                    if (extUrl.StartsWith("/"))
                    {
                        extUrl = ConfigManager.Current.ServerUrl.TrimEnd('/') + extUrl;
                    }
                    if (Uri.TryCreate(extUrl, UriKind.Absolute, out var externalUri) &&
                        (externalUri.Scheme == Uri.UriSchemeHttp || externalUri.Scheme == Uri.UriSchemeHttps))
                    {
                        try { Process.Start(new ProcessStartInfo(externalUri.ToString()) { UseShellExecute = true }); } catch { }
                    }
                }
                break;

            case "open-anydesk":
                OpenAnyDesk();
                break;

            case "open-folder":
            case "open-path":
                string folder = data.ValueKind == JsonValueKind.String ? data.GetString() ?? "" : "";
                if (!string.IsNullOrEmpty(folder))
                {
                    try { Process.Start(new ProcessStartInfo("explorer.exe", folder) { UseShellExecute = true }); } catch { }
                }
                break;

            case "show-notification":
                string title = "Yeni Bildirim";
                string body = "";
                if (data.ValueKind == JsonValueKind.Object)
                {
                    if (data.TryGetProperty("title", out var t)) title = t.GetString() ?? title;
                    if (data.TryGetProperty("body", out var b)) body = b.GetString() ?? "";
                }
                _trayIcon.ShowBalloonTip(4000, title, body, ToolTipIcon.Info);
                break;

            // IT Hızlı Onarım Araçları
            case "kiosk-flush-dns":
                SystemRepairHelper.FlushDns(out string dnsMsg);
                _trayIcon.ShowBalloonTip(3500, "DNS Onarımı", dnsMsg, ToolTipIcon.Info);
                break;

            case "kiosk-reset-spooler":
                SystemRepairHelper.ResetPrintSpooler(out string spoolMsg);
                _trayIcon.ShowBalloonTip(4500, "Yazıcı Servisi", spoolMsg, ToolTipIcon.Info);
                break;

            case "kiosk-renew-ip":
                SystemRepairHelper.RenewIp(out string ipMsg);
                _trayIcon.ShowBalloonTip(4000, "Ağ Yenileme", ipMsg, ToolTipIcon.Info);
                break;

            case "kiosk-copy-specs":
                SystemRepairHelper.CopySystemSummaryToClipboard(out _);
                _trayIcon.ShowBalloonTip(3500, "Sistem Raporu", "Bilgisayar donanım ve ağ bilgileri panoya kopyalandı.", ToolTipIcon.Info);
                break;
        }
    }

    private void SendWebEvent(string channel, object detail)
    {
        try
        {
            string channelJson = JsonSerializer.Serialize(channel);
            string detailJson = JsonSerializer.Serialize(detail);
            this.BeginInvoke((MethodInvoker)delegate
            {
                try
                {
                    _ = _webView.CoreWebView2.ExecuteScriptAsync($"window.dispatchEvent(new CustomEvent('kiosk-event-' + {channelJson}, {{ detail: {detailJson} }}));");
                }
                catch { }
            });
        }
        catch { }
    }

    public static string GetAnyDeskId()
    {
        // AnyDesk'in yeni sürümleri --get-id parametresini cevaplamıyor.
        // Önce resmi istemci/service ayarlarını ve kayıt defterini okuyarak
        // ID'yi arıyoruz; komut satırı yöntemi yalnızca son yedek olarak kullanılır.
        foreach (string configPath in GetAnyDeskConfigCandidates())
        {
            string id = TryReadAnyDeskConfigId(configPath);
            if (!string.IsNullOrWhiteSpace(id)) return id;
        }

        string registryId = TryReadAnyDeskRegistryId();
        if (!string.IsNullOrWhiteSpace(registryId)) return registryId;

        foreach (string candidate in GetAnyDeskCandidates())
        {
            string id = TryReadAnyDeskId(candidate);
            if (!string.IsNullOrWhiteSpace(id)) return id;
        }

        return "";
    }

    private static IEnumerable<string> GetAnyDeskConfigCandidates()
    {
        string programData = Environment.GetFolderPath(Environment.SpecialFolder.CommonApplicationData);
        string appData = Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData);
        string localAppData = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
        string[] paths =
        {
            Path.Combine(programData, "AnyDesk", "service.conf"),
            Path.Combine(programData, "AnyDesk", "system.conf"),
            Path.Combine(programData, "AnyDesk", "user.conf"),
            Path.Combine(appData, "AnyDesk", "service.conf"),
            Path.Combine(appData, "AnyDesk", "system.conf"),
            Path.Combine(appData, "AnyDesk", "user.conf"),
            Path.Combine(localAppData, "AnyDesk", "service.conf"),
            Path.Combine(localAppData, "AnyDesk", "system.conf"),
            Path.Combine(localAppData, "AnyDesk", "user.conf"),
        };

        var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (string path in paths)
        {
            if (!string.IsNullOrWhiteSpace(path) && seen.Add(path)) yield return path;
        }
    }

    private static string TryReadAnyDeskConfigId(string path)
    {
        try
        {
            if (!File.Exists(path)) return "";
            string contents = File.ReadAllText(path);
            // AnyDesk config anahtarı sürüme göre ad.anynet.id veya client_id
            // şeklinde gelebiliyor. Yalnızca 6-12 haneli sayıları kabul ediyoruz.
            Match match = Regex.Match(
                contents,
                @"(?im)^\s*(?:ad\.anynet\.)?(?:id|client[_-]?id)\s*[:=]\s*(?<id>\d{6,12})\b");
            return match.Success ? match.Groups["id"].Value : "";
        }
        catch
        {
            return "";
        }
    }

    private static string TryReadAnyDeskRegistryId()
    {
        string[] subKeys =
        {
            @"SOFTWARE\AnyDesk",
            @"SOFTWARE\WOW6432Node\AnyDesk",
            @"SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\AnyDesk",
            @"SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\AnyDesk",
        };

        foreach (RegistryHive hive in new[] { RegistryHive.LocalMachine, RegistryHive.CurrentUser })
        {
            foreach (RegistryView view in new[] { RegistryView.Registry64, RegistryView.Registry32, RegistryView.Default })
            {
                try
                {
                    using RegistryKey baseKey = RegistryKey.OpenBaseKey(hive, view);
                    foreach (string subKeyPath in subKeys)
                    {
                        using RegistryKey? key = baseKey.OpenSubKey(subKeyPath);
                        if (key == null) continue;
                        foreach (string valueName in key.GetValueNames())
                        {
                            if (!valueName.Contains("id", StringComparison.OrdinalIgnoreCase)) continue;
                            string raw = Convert.ToString(key.GetValue(valueName)) ?? "";
                            Match match = Regex.Match(raw, @"\b\d{6,12}\b");
                            if (match.Success) return match.Value;
                        }
                    }
                }
                catch
                {
                    // Erişilemeyen hive/view için diğer olasılıkları denemeye devam et.
                }
            }
        }

        return "";
    }

    private static IEnumerable<string> GetAnyDeskCandidates()
    {
        string programFiles = Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles);
        string programFilesX86 = Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86);
        string localAppData = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
        string commonAppData = Environment.GetFolderPath(Environment.SpecialFolder.CommonApplicationData);

        string[] direct =
        {
            @"C:\Program Files\AnyDesk\AnyDesk.exe",
            @"C:\Program Files (x86)\AnyDesk\AnyDesk.exe",
            @"C:\Program Files\AnyDesk\previous-version",
            @"C:\Program Files (x86)\AnyDesk\previous-version",
            @"C:\ProgramData\AnyDesk\AnyDesk.exe",
            Path.Combine(programFiles, "AnyDesk", "AnyDesk.exe"),
            Path.Combine(programFilesX86, "AnyDesk", "AnyDesk.exe"),
            Path.Combine(programFiles, "AnyDesk", "previous-version"),
            Path.Combine(programFilesX86, "AnyDesk", "previous-version"),
            Path.Combine(localAppData, "Programs", "AnyDesk", "AnyDesk.exe"),
            Path.Combine(localAppData, "AnyDesk", "AnyDesk.exe"),
            Path.Combine(commonAppData, "AnyDesk", "AnyDesk.exe"),
        };

        var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (string registryCandidate in GetAnyDeskRegistryExecutables())
        {
            if (!string.IsNullOrWhiteSpace(registryCandidate) && seen.Add(registryCandidate))
                yield return registryCandidate;
        }
        foreach (string candidate in direct)
        {
            if (string.IsNullOrWhiteSpace(candidate)) continue;
            if (seen.Add(candidate)) yield return candidate;
        }
    }

    private static IEnumerable<string> GetAnyDeskRegistryExecutables()
    {
        var results = new List<string>();
        string[] subKeys =
        {
            @"SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\AnyDesk",
            @"SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\AnyDesk",
        };

        foreach (RegistryHive hive in new[] { RegistryHive.LocalMachine, RegistryHive.CurrentUser })
        {
            foreach (RegistryView view in new[] { RegistryView.Registry64, RegistryView.Registry32, RegistryView.Default })
            {
                try
                {
                    using RegistryKey baseKey = RegistryKey.OpenBaseKey(hive, view);
                    foreach (string subKeyPath in subKeys)
                    {
                        using RegistryKey? key = baseKey.OpenSubKey(subKeyPath);
                        if (key == null) continue;
                        string? icon = key.GetValue("DisplayIcon") as string;
                        string? installLocation = key.GetValue("InstallLocation") as string;
                        if (!string.IsNullOrWhiteSpace(icon))
                        {
                            string candidate = icon.Trim().Trim('"');
                            int comma = candidate.IndexOf(',');
                            if (comma > 0) candidate = candidate[..comma];
                            if (candidate.EndsWith("AnyDesk.exe", StringComparison.OrdinalIgnoreCase)) results.Add(candidate);
                        }
                        if (!string.IsNullOrWhiteSpace(installLocation))
                        {
                            results.Add(Path.Combine(installLocation.Trim().Trim('"'), "AnyDesk.exe"));
                        }
                    }
                }
                catch
                {
                    // Kayıt defterindeki bir view okunamazsa dosya yollarını denemeye devam et.
                }
            }
        }

        foreach (string result in results) yield return result;
    }

    private static string? FindAnyDeskExe()
    {
        foreach (string candidate in GetAnyDeskCandidates())
        {
            try
            {
                if (File.Exists(candidate)) return candidate;
            }
            catch { }
        }
        return null;
    }

    private static string TryReadAnyDeskId(string exePath)
    {
        try
        {
            if (!File.Exists(exePath)) return "";
            using var process = new Process();
            process.StartInfo = new ProcessStartInfo(exePath, "--get-id")
            {
                UseShellExecute = false,
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                CreateNoWindow = true,
                WindowStyle = ProcessWindowStyle.Hidden,
            };
            process.Start();
            if (!process.WaitForExit(2500))
            {
                try { process.Kill(); } catch { }
                return "";
            }
            string output = process.StandardOutput.ReadToEnd().Trim();
            return output.Replace(" ", "");
        }
        catch
        {
            return "";
        }
    }

    private static Dictionary<string, int?> GetSharedFolderCounts()
    {
        string[] folders =
        {
            @"\\192.168.3.100\havuz",
            @"\\192.168.3.110\ingest1",
            @"\\192.168.3.110\ingest2",
            @"\\192.168.3.111\ingest4",
        };

        var counts = new Dictionary<string, int?>(StringComparer.OrdinalIgnoreCase);
        foreach (string folder in folders)
        {
            try
            {
                int count = 0;
                foreach (string _ in Directory.EnumerateFiles(folder))
                {
                    count++;
                    if (count > 9999) break;
                }
                counts[folder] = count;
            }
            catch
            {
                counts[folder] = null;
            }
        }

        return counts;
    }

    private void OpenAnyDesk()
    {
        try
        {
            string? exe = FindAnyDeskExe();
            if (!string.IsNullOrWhiteSpace(exe))
            {
                Process.Start(new ProcessStartInfo { FileName = exe, UseShellExecute = false, WorkingDirectory = Path.GetDirectoryName(exe) ?? AppDomain.CurrentDomain.BaseDirectory });
                return;
            }

            try { Process.Start(new ProcessStartInfo("anydesk:") { UseShellExecute = true }); }
            catch { Process.Start(new ProcessStartInfo { FileName = "AnyDesk.exe", UseShellExecute = true }); }
        }
        catch
        {
            try
            {
                MessageBox.Show(this,
                    "AnyDesk bu bilgisayarda bulunamadı. Kurulumdan sonra kiosk uygulamasını yeniden başlatın.",
                    "AnyDesk bağlantısı",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Information);
            }
            catch { }
            _trayIcon.ShowBalloonTip(3500, "AnyDesk", "AnyDesk açılamadı. Lütfen cihazda AnyDesk kurulumunu kontrol edin.", ToolTipIcon.Warning);
        }
    }

    private void OpenMarsisDirect()
    {
        try
        {
            Process.Start(new ProcessStartInfo("http://news") { UseShellExecute = true });
        }
        catch
        {
            _trayIcon.ShowBalloonTip(3000, "Marsis", "http://news açılamadı. Lütfen ağ bağlantınızı kontrol edin.", ToolTipIcon.Warning);
        }
    }

    private void OpenGoogleAuthPopup(string? targetUrl = null)
    {
        if (_activeAuthForm != null && !_activeAuthForm.IsDisposed)
        {
            _activeAuthForm.Focus();
            return;
        }

        string server = ConfigManager.Current.ServerUrl.TrimEnd('/');
        string url = targetUrl ?? $"{server}/api/auth/google-start?callbackUrl={Uri.EscapeDataString(server + "/kiosk")}";

        _activeAuthForm = new AuthForm(url, async () =>
        {
            // Giriş başarılı oldu -> Çerezi temizle ve Kiosk'u yenile
            try
            {
                if (_webView.CoreWebView2 != null)
                {
                    await _webView.CoreWebView2.ExecuteScriptAsync(
                        "document.cookie = 'kiosk_logged_out=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';"
                    );
                }
            }
            catch { }

            ReloadKiosk();
        });

        _activeAuthForm.Show();
    }

        private void CoreWebView2_NavigationStarting(object? sender, CoreWebView2NavigationStartingEventArgs e)
    {
        string uri = e.Uri;
        string server = ConfigManager.Current.ServerUrl.TrimEnd('/');

        // 1. Google OAuth ve Auth akislarina izin ver
        if (IsGoogleAuthUri(uri))
        {
            return;
        }

        // 2. Kiosk kendi sayfasina gidiyorsa izin ver
        if (IsTrustedServerUri(uri) && new Uri(uri).AbsolutePath.StartsWith("/kiosk", StringComparison.OrdinalIgnoreCase))
        {
            return;
        }

        // 3. Ic baglantilar (localhost, server vb.) - asla dis tarayicida acma, Kiosk'a yonlendir!
        if (IsTrustedServerUri(uri))
        {
            e.Cancel = true;
            NavigateToKiosk();
            return;
        }

        // 4. Harici linkleri varsayilan tarayicida ac
        e.Cancel = true;
        OpenExternalWebUri(uri);
    }

    private void CoreWebView2_NewWindowRequested(object? sender, CoreWebView2NewWindowRequestedEventArgs e)
    {
        e.Handled = true;
        string uri = e.Uri;
        string server = ConfigManager.Current.ServerUrl.TrimEnd('/');

        if (IsGoogleAuthUri(uri))
        {
            _webView.CoreWebView2.Navigate(uri);
            return;
        }

        if (IsTrustedServerUri(uri))
        {
            NavigateToKiosk();
            return;
        }

        OpenExternalWebUri(uri);
    }

    private static void OpenExternalWebUri(string value)
    {
        if (!Uri.TryCreate(value, UriKind.Absolute, out var uri)) return;
        if (uri.Scheme != Uri.UriSchemeHttp && uri.Scheme != Uri.UriSchemeHttps) return;
        try { Process.Start(new ProcessStartInfo(uri.ToString()) { UseShellExecute = true }); } catch { }
    }

    private static bool IsGoogleAuthUri(string value)
    {
        if (!Uri.TryCreate(value, UriKind.Absolute, out var uri)) return false;
        return uri.Scheme == Uri.UriSchemeHttps &&
               (uri.Host.Equals("accounts.google.com", StringComparison.OrdinalIgnoreCase) ||
                uri.Host.EndsWith(".google.com", StringComparison.OrdinalIgnoreCase));
    }

    private void SetWebVisibility(bool visible)
    {
        try
        {
            if (_webView.CoreWebView2 == null) return;
            string value = visible ? "true" : "false";
            _ = _webView.CoreWebView2.ExecuteScriptAsync($"window.__halktvKioskVisible={value};window.dispatchEvent(new CustomEvent('kiosk-event-kiosk-visibility',{{detail:{{visible:{value}}}}}));");
        }
        catch { }
    }

    private static bool IsTrustedServerUri(string value)
    {
        if (!Uri.TryCreate(value, UriKind.Absolute, out var candidate)) return false;
        if (!Uri.TryCreate(ConfigManager.Current.ServerUrl, UriKind.Absolute, out var configured)) return false;
        return candidate.Scheme.Equals(configured.Scheme, StringComparison.OrdinalIgnoreCase) &&
               candidate.Host.Equals(configured.Host, StringComparison.OrdinalIgnoreCase) &&
               candidate.Port == configured.Port;
    }
}

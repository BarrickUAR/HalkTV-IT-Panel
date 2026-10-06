using System;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Runtime.InteropServices;
using System.Text;
using System.Windows.Forms;

namespace HalkTvClient;

public class TrayContext : ApplicationContext
{
    // CredUIPromptForWindowsCredentials (Windows UAC Credential Dialog)
    [DllImport("credui.dll", CharSet = CharSet.Unicode)]
    private static extern uint CredUIPromptForWindowsCredentials(
        ref CREDUI_INFO pUiInfo,
        uint dwAuthError,
        ref uint pulAuthPackage,
        IntPtr pvInAuthBuffer,
        uint ulInAuthBufferSize,
        out IntPtr ppvOutAuthBuffer,
        out uint pulOutAuthBufferSize,
        ref bool pfSave,
        CREDUIWIN_FLAGS dwFlags
    );

    [DllImport("credui.dll", CharSet = CharSet.Unicode)]
    private static extern bool CredUnPackAuthenticationBuffer(
        uint dwFlags,
        IntPtr pAuthBuffer,
        uint cbAuthBuffer,
        StringBuilder pszUserName,
        ref uint pcchMaxUserName,
        StringBuilder pszDomainName,
        ref uint pcchMaxDomainName,
        StringBuilder pszPassword,
        ref uint pcchMaxPassword
    );

    [DllImport("ole32.dll")]
    private static extern void CoTaskMemFree(IntPtr ptr);

    [DllImport("advapi32.dll", SetLastError = true)]
    private static extern bool LogonUser(
        string lpszUsername,
        string lpszDomain,
        string lpszPassword,
        int dwLogonType,
        int dwLogonProvider,
        out IntPtr phToken
    );

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool CloseHandle(IntPtr hObject);

    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    private struct CREDUI_INFO
    {
        public int cbSize;
        public IntPtr hwndParent;
        public string pszMessageText;
        public string pszCaptionText;
        public IntPtr hbmBanner;
    }

    [Flags]
    private enum CREDUIWIN_FLAGS : uint
    {
        CREDUIWIN_GENERIC = 0x00000001,
        CREDUIWIN_CHECKBOX = 0x00000002,
        CREDUIWIN_AUTHPACKAGE_ONLY = 0x00000010,
        CREDUIWIN_IN_CRED_ONLY = 0x00000020,
        CREDUIWIN_ENUMERATE_ADMINS = 0x00000100,
        CREDUIWIN_ENUMERATE_CURRENT_USER = 0x00000200,
        CREDUIWIN_SECURE_PROMPT = 0x00001000,
        CREDUIWIN_PREPROMPTING = 0x00002000,
    }

    private const int LOGON32_LOGON_INTERACTIVE = 2;
    private const int LOGON32_PROVIDER_DEFAULT = 0;
    private const uint CRED_PACK_PROTECTED_CREDENTIALS = 1;

    private readonly NotifyIcon _trayIcon;
    private KioskForm _kioskForm;
    private ToolStripMenuItem? _autoStartMenuItem;
    private RemoteCommandService? _remoteCommandService;

    public TrayContext()
    {
        ConfigManager.Load();
        try { ConfigManager.SetAutoStart(true); } catch { }

        _trayIcon = new NotifyIcon
        {
            Text = "HalkTV Teknik Destek Kiosk [Ctrl+Shift+H]",
            Visible = true
        };

        LoadTrayIcon();

        _kioskForm = new KioskForm(_trayIcon);

        // Uzak Komut Servisi başlat
        _remoteCommandService = new RemoteCommandService(
            ConfigManager.Current.ServerUrl,
            _trayIcon,
            _kioskForm
        );
        _remoteCommandService.Start();

        var contextMenu = new ContextMenuStrip();

        var openKioskItem = new ToolStripMenuItem("🖥️ Teknik Destek (Kiosk) [Ctrl+Shift+H]", null, (s, e) => _kioskForm.ToggleVisibility())
        {
            Font = new Font(contextMenu.Font, FontStyle.Bold)
        };
        contextMenu.Items.Add(openKioskItem);

        var openDashboardItem = new ToolStripMenuItem("🌐 Ana Paneli Aç", null, (s, e) => OpenDashboard());
        contextMenu.Items.Add(openDashboardItem);

        contextMenu.Items.Add(new ToolStripSeparator());

        var marsisItem = new ToolStripMenuItem("📡 Marsis'e Bağlan (http://news)", null, (s, e) => OpenMarsis());
        contextMenu.Items.Add(marsisItem);

        var printersItem = new ToolStripMenuItem("🖨️ Windows Yazıcılar", null, (s, e) => OpenPrinters());
        contextMenu.Items.Add(printersItem);

        var networkItem = new ToolStripMenuItem("📶 Ağ Ayarları", null, (s, e) => OpenNetwork());
        contextMenu.Items.Add(networkItem);

        contextMenu.Items.Add(new ToolStripSeparator());

        // 🛠️ Hızlı Sistem Onarımı Alt Menüsü
        var repairMenu = new ToolStripMenuItem("🛠️ Hızlı Sistem Onarımı");

        repairMenu.DropDownItems.Add(new ToolStripMenuItem("🧹 DNS Önbelleğini Temizle", null, (s, e) =>
        {
            SystemRepairHelper.FlushDns(out string msg);
            _trayIcon.ShowBalloonTip(3500, "DNS Onarımı", msg, ToolTipIcon.Info);
        }));

        repairMenu.DropDownItems.Add(new ToolStripMenuItem("🖨️ Yazıcı Kuyruğunu Sıfırla (Spooler)", null, (s, e) =>
        {
            SystemRepairHelper.ResetPrintSpooler(out string msg);
            _trayIcon.ShowBalloonTip(4500, "Yazıcı Servisi", msg, ToolTipIcon.Info);
        }));

        repairMenu.DropDownItems.Add(new ToolStripMenuItem("🔄 Ağ Bağlantısını Yenile (IP Renew)", null, (s, e) =>
        {
            SystemRepairHelper.RenewIp(out string msg);
            _trayIcon.ShowBalloonTip(4000, "Ağ Yenileme", msg, ToolTipIcon.Info);
        }));

        repairMenu.DropDownItems.Add(new ToolStripSeparator());

        repairMenu.DropDownItems.Add(new ToolStripMenuItem("📋 Sistem Bilgilerini Panoya Kopyala", null, (s, e) =>
        {
            SystemRepairHelper.CopySystemSummaryToClipboard(out _);
            _trayIcon.ShowBalloonTip(3500, "Sistem Raporu", "Bilgisayar donanım ve ağ bilgileri panoya kopyalandı.", ToolTipIcon.Info);
        }));

        repairMenu.DropDownItems.Add(new ToolStripMenuItem("⚙️ Aygıt Yöneticisi", null, (s, e) =>
        {
            try { Process.Start(new ProcessStartInfo("devmgmt.msc") { UseShellExecute = true }); } catch { }
        }));

        repairMenu.DropDownItems.Add(new ToolStripMenuItem("📊 Görev Yöneticisi", null, (s, e) =>
        {
            try { Process.Start(new ProcessStartInfo("taskmgr.exe") { UseShellExecute = true }); } catch { }
        }));

        contextMenu.Items.Add(repairMenu);

        contextMenu.Items.Add(new ToolStripSeparator());

        // 🔐 Bilgi İşlem (IT) Menüsü
        var itMenu = new ToolStripMenuItem("🔐 Bilgi İşlem (IT) Menüsü");

        itMenu.DropDownItems.Add(new ToolStripMenuItem("⚙️ Sunucu Adresi Ayarla...", null, (s, e) => PromptServerUrl()));

        _autoStartMenuItem = new ToolStripMenuItem("🚀 Windows Açılışında Başlat", null, (s, e) => ToggleAutoStart())
        {
            Checked = ConfigManager.IsAutoStartEnabled()
        };
        itMenu.DropDownItems.Add(_autoStartMenuItem);

        itMenu.DropDownItems.Add(new ToolStripSeparator());

        itMenu.DropDownItems.Add(new ToolStripMenuItem("🚪 Kiosk Uygulamasını Kapat", null, (s, e) => ExitApp()));

        contextMenu.Items.Add(itMenu);

        _trayIcon.ContextMenuStrip = contextMenu;

        // Sol tık ile Kiosk aç/kapat
        _trayIcon.MouseClick += (s, e) =>
        {
            if (e.Button == MouseButtons.Left)
            {
                _kioskForm.ToggleVisibility();
            }
        };

        // Balloon tip tıklandığında Kiosk'u aç
        _trayIcon.BalloonTipClicked += (s, e) =>
        {
            if (!_kioskForm.Visible)
            {
                _kioskForm.ToggleVisibility();
            }
        };

        // Ekran çözünürlüğü değiştiğinde Kiosk formunu tekrar sağ alta hizala
        Microsoft.Win32.SystemEvents.DisplaySettingsChanged += (s, e) =>
        {
            _kioskForm.UpdateBoundsToTaskbar();
        };

        // Başlangıçta Kiosk formunu göster
        _kioskForm.ToggleVisibility();
    }

    private void LoadTrayIcon()
    {
        try
        {
            string iconPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "assets", "icon.ico");
            if (File.Exists(iconPath))
            {
                _trayIcon.Icon = new Icon(iconPath);
                return;
            }

            string pngPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "assets", "icon.png");
            if (File.Exists(pngPath))
            {
                using var bmp = new Bitmap(pngPath);
                IntPtr hIcon = bmp.GetHicon();
                _trayIcon.Icon = Icon.FromHandle(hIcon);
                return;
            }

            // Tek dosya yayında assets klasörü dağıtılmaz; simge EXE'ye gömülüdür.
            string? executable = Environment.ProcessPath;
            if (!string.IsNullOrWhiteSpace(executable))
            {
                using Icon? embedded = Icon.ExtractAssociatedIcon(executable);
                if (embedded != null)
                {
                    _trayIcon.Icon = (Icon)embedded.Clone();
                    return;
                }
            }
        }
        catch { }

        _trayIcon.Icon = SystemIcons.Application;
    }

    private void OpenDashboard()
    {
        try
        {
            string url = ConfigManager.Current.ServerUrl.TrimEnd('/') + "/dashboard";
            Process.Start(new ProcessStartInfo(url) { UseShellExecute = true });
        }
        catch { }
    }

    private void OpenMarsis()
    {
        try
        {
            Process.Start(new ProcessStartInfo("http://news") { UseShellExecute = true });
        }
        catch { }
    }

    private void OpenPrinters()
    {
        try
        {
            Process.Start(new ProcessStartInfo("control", "printers") { UseShellExecute = true });
        }
        catch
        {
            try { Process.Start(new ProcessStartInfo("ms-settings:printers") { UseShellExecute = true }); } catch { }
        }
    }

    private void OpenNetwork()
    {
        try
        {
            Process.Start(new ProcessStartInfo("ncpa.cpl") { UseShellExecute = true });
        }
        catch
        {
            try { Process.Start(new ProcessStartInfo("ms-settings:network") { UseShellExecute = true }); } catch { }
        }
    }

    private void PromptServerUrl()
    {
        if (!ConfirmAdministrator()) return;
        using var prompt = new Form
        {
            Width = 420,
            Height = 170,
            FormBorderStyle = FormBorderStyle.FixedDialog,
            Text = "Sunucu Adresi Ayarla",
            StartPosition = FormStartPosition.CenterScreen,
            MaximizeBox = false,
            MinimizeBox = false,
            TopMost = true
        };

        var label = new Label { Left = 20, Top = 15, Width = 360, Text = "HalkTV Panel Sunucu Adresi (Örn: http://192.168.3.79:3000):" };
        var textBox = new TextBox { Left = 20, Top = 40, Width = 360, Text = ConfigManager.Current.ServerUrl };
        var btnOk = new Button { Text = "Kaydet", Left = 220, Width = 75, Top = 80, DialogResult = DialogResult.OK };
        var btnCancel = new Button { Text = "İptal", Left = 305, Width = 75, Top = 80, DialogResult = DialogResult.Cancel };

        prompt.Controls.Add(label);
        prompt.Controls.Add(textBox);
        prompt.Controls.Add(btnOk);
        prompt.Controls.Add(btnCancel);
        prompt.AcceptButton = btnOk;
        prompt.CancelButton = btnCancel;

        if (prompt.ShowDialog() == DialogResult.OK && !string.IsNullOrWhiteSpace(textBox.Text))
        {
            string newUrl = textBox.Text.Trim();
            if (!newUrl.StartsWith("http://") && !newUrl.StartsWith("https://"))
            {
                newUrl = "http://" + newUrl;
            }
            if (!Uri.TryCreate(newUrl, UriKind.Absolute, out var serverUri) ||
                (serverUri.Scheme != "http" && serverUri.Scheme != "https") ||
                !string.IsNullOrEmpty(serverUri.UserInfo) || serverUri.AbsolutePath != "/" ||
                !string.IsNullOrEmpty(serverUri.Query) || !string.IsNullOrEmpty(serverUri.Fragment))
            {
                MessageBox.Show("Geçerli bir sunucu kök adresi girin (https://destek.halktv.local).", "Sunucu adresi");
                return;
            }
            newUrl = serverUri.GetLeftPart(UriPartial.Authority);
            if (string.Equals(newUrl, ConfigManager.Current.ServerUrl.TrimEnd('/'), StringComparison.OrdinalIgnoreCase)) return;
            var previousUrl = ConfigManager.Current.ServerUrl;
            var previousId = ConfigManager.Current.DeviceId;
            var previousToken = ConfigManager.Current.DeviceToken;
            var previousSecret = ConfigManager.Current.ApiSecret;
            ConfigManager.Current.ServerUrl = newUrl;
            ConfigManager.Current.DeviceId = "";
            ConfigManager.Current.DeviceToken = "";
            ConfigManager.Current.ApiSecret = "";
            if (!ConfigManager.Save()) {
                ConfigManager.Current.ServerUrl = previousUrl;
                ConfigManager.Current.DeviceId = previousId;
                ConfigManager.Current.DeviceToken = previousToken;
                ConfigManager.Current.ApiSecret = previousSecret;
                MessageBox.Show("Sunucu ayarı kaydedilemedi.", "Sunucu adresi");
                return;
            }
            _remoteCommandService?.Dispose();
            _kioskForm.Dispose();
            _kioskForm = new KioskForm(_trayIcon);
            _remoteCommandService = new RemoteCommandService(newUrl, _trayIcon, _kioskForm);
            _remoteCommandService.Start();
            _kioskForm.ToggleVisibility();
            _trayIcon.ShowBalloonTip(3000, "Sunucu Güncellendi", "Yeni sunucuda cihazı yeniden eşleştirin.", ToolTipIcon.Info);
        }
    }

    private void ToggleAutoStart()
    {
        if (!ConfirmAdministrator()) return;
        bool current = ConfigManager.IsAutoStartEnabled();
        ConfigManager.SetAutoStart(!current);
        if (_autoStartMenuItem != null)
        {
            _autoStartMenuItem.Checked = !current;
        }

        string msg = !current ? "HalkTV Kiosk artık Windows açılışında otomatik başlayacak." : "Otomatik başlatma kapatıldı.";
        _trayIcon.ShowBalloonTip(3000, "Başlangıç Ayarı", msg, ToolTipIcon.Info);
    }

    private void ExitApp()
    {
        try
        {
            var psi = new System.Diagnostics.ProcessStartInfo
            {
                FileName = "cmd.exe",
                Arguments = "/c exit",
                Verb = "runas",
                UseShellExecute = true,
                WindowStyle = System.Diagnostics.ProcessWindowStyle.Hidden
            };
            var proc = System.Diagnostics.Process.Start(psi); if (proc != null) { proc.WaitForExit(); _trayIcon.Visible = false; _trayIcon.Dispose(); _kioskForm.Dispose(); Environment.Exit(0); }
        }
        catch { }
    }

    private static bool ConfirmAdministrator()
    {
        try {
            using var process = Process.Start(new ProcessStartInfo(Path.Combine(Environment.SystemDirectory, "cmd.exe"), "/d /c exit 0") {
                Verb = "runas", UseShellExecute = true, WindowStyle = ProcessWindowStyle.Hidden
            });
            if (process == null) return false;
            process.WaitForExit();
            return process.ExitCode == 0;
        }
        catch { return false; }
    }
}

using System;
using System.Drawing;
using System.IO;
using System.Windows.Forms;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

namespace HalkTvClient;

public class AuthForm : Form
{
    private readonly WebView2 _webView;
    private readonly Action _onSuccess;
    private readonly string _authUrl;
    private bool _isCompleted = false;

    public AuthForm(string authUrl, Action onSuccess)
    {
        _authUrl = authUrl;
        _onSuccess = onSuccess;

        Text = "HalkTV - Google ile Giriş Yap";
        Size = new Size(560, 740);
        StartPosition = FormStartPosition.CenterScreen;
        FormBorderStyle = FormBorderStyle.FixedDialog;
        MaximizeBox = false;
        MinimizeBox = false;
        ShowInTaskbar = true;
        TopMost = true;

        string iconPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "assets", "icon.ico");
        if (File.Exists(iconPath))
        {
            try { Icon = new Icon(iconPath); } catch { }
        }
        else if (!string.IsNullOrWhiteSpace(Environment.ProcessPath))
        {
            try { Icon = Icon.ExtractAssociatedIcon(Environment.ProcessPath); } catch { }
        }

        _webView = new WebView2
        {
            Dock = DockStyle.Fill
        };
        Controls.Add(_webView);

        InitializeWebView();
    }

    private async void InitializeWebView()
    {
        try
        {
            // Ortak Environment: Kiosk ile AYNI cookie deposunu ve oturumu kullanır!
            var env = await WebViewEnvironment.GetEnvironmentAsync();
            await _webView.EnsureCoreWebView2Async(env);

            _webView.CoreWebView2.Settings.UserAgent = WebViewEnvironment.UserAgent;
            _webView.CoreWebView2.Settings.IsStatusBarEnabled = false;

            _webView.CoreWebView2.NavigationStarting += CoreWebView2_NavigationStarting;
            _webView.CoreWebView2.SourceChanged += CoreWebView2_SourceChanged;
            _webView.CoreWebView2.NavigationCompleted += CoreWebView2_NavigationCompleted;

            _webView.Source = new Uri(_authUrl);
        }
        catch (Exception ex)
        {
            MessageBox.Show("Giriş penceresi başlatılamadı: " + ex.Message, "Hata", MessageBoxButtons.OK, MessageBoxIcon.Error);
            Close();
        }
    }

    private void CheckAuthCompletion(string url)
    {
        if (_isCompleted) return;

        string server = ConfigManager.Current.ServerUrl.TrimEnd('/');

        // Başlangıç, ara yönlendirmeler ve hata durumunda erken kapanmayı engelle
        if (url.Contains("/api/auth/google-start") ||
            url.Contains("/api/auth/signin") ||
            url.Contains("accounts.google.com") ||
            url.Contains("/login"))
        {
            return;
        }

        // 1. Kiosk veya Dashboard rotasına dönüldü mü?
        bool isKioskOrDash = url.Contains("/kiosk") || url.Contains("/dashboard");

        // 2. Google OAuth callback bitti mi ve uygulamaya geri döndü mü?
        bool isAppRoot = (url.StartsWith(server) || url.Contains("localhost:3000") || url.Contains("192.168.3.79:3000"))
                         && !url.Contains("/api/auth") && !url.Contains("error=");

        if (isKioskOrDash || isAppRoot)
        {
            _isCompleted = true;

            // Session çerezinin diske tam yazılması için 700ms bekleyip kapat
            var timer = new System.Windows.Forms.Timer { Interval = 700 };
            timer.Tick += (s, e) =>
            {
                timer.Stop();
                timer.Dispose();
                try
                {
                    _onSuccess?.Invoke();
                }
                catch { }
                Close();
            };
            timer.Start();
        }
    }

    private void CoreWebView2_NavigationStarting(object? sender, CoreWebView2NavigationStartingEventArgs e)
    {
        CheckAuthCompletion(e.Uri);
    }

    private void CoreWebView2_SourceChanged(object? sender, CoreWebView2SourceChangedEventArgs e)
    {
        if (_webView.Source != null)
        {
            CheckAuthCompletion(_webView.Source.ToString());
        }
    }

    private void CoreWebView2_NavigationCompleted(object? sender, CoreWebView2NavigationCompletedEventArgs e)
    {
        if (_webView.Source != null)
        {
            CheckAuthCompletion(_webView.Source.ToString());
        }
    }
}

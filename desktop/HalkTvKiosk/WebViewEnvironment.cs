using System;
using System.IO;
using System.Threading.Tasks;
using Microsoft.Web.WebView2.Core;

namespace HalkTvClient;

public static class WebViewEnvironment
{
    private static CoreWebView2Environment? _environment;
    private static readonly SemaphoreSlim _lock = new(1, 1);

    public const string UserAgent =
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";

    public static async Task<CoreWebView2Environment> GetEnvironmentAsync()
    {
        if (_environment != null) return _environment;

        await _lock.WaitAsync();
        try
        {
            if (_environment != null) return _environment;

            string userDataFolder = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                "HalkTvKiosk",
                "SharedProfile"
            );

            if (!Directory.Exists(userDataFolder))
            {
                Directory.CreateDirectory(userDataFolder);
            }

            _environment = await CoreWebView2Environment.CreateAsync(null, userDataFolder);
            return _environment;
        }
        finally
        {
            _lock.Release();
        }
    }
}

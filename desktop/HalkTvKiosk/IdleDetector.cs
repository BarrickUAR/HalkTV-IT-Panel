using System;
using System.Runtime.InteropServices;

namespace HalkTvClient;

/// <summary>
/// Windows LASTINPUTINFO ile kullanıcının boşta kalma süresini ölçer.
/// </summary>
public static class IdleDetector
{
    [StructLayout(LayoutKind.Sequential)]
    private struct LASTINPUTINFO
    {
        public uint cbSize;
        public uint dwTime;
    }

    [DllImport("user32.dll")]
    private static extern bool GetLastInputInfo(ref LASTINPUTINFO plii);

    /// <summary>
    /// Kullanıcının en son fare/klavye aktivitesinden bu yana geçen saniye sayısı.
    /// </summary>
    public static int GetIdleSeconds()
    {
        var lastInput = new LASTINPUTINFO { cbSize = (uint)Marshal.SizeOf(typeof(LASTINPUTINFO)) };
        if (!GetLastInputInfo(ref lastInput)) return 0;

        uint idleMs = (uint)Environment.TickCount - lastInput.dwTime;
        return (int)(idleMs / 1000u);
    }

    /// <summary>
    /// Kullanıcının boşta kalıp kalmadığını kontrol eder.
    /// </summary>
    public static bool IsIdle(int thresholdSeconds = 300) => GetIdleSeconds() >= thresholdSeconds;
}

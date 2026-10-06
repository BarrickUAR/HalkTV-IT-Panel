using System;
using System.IO;
using System.Threading;
using System.Windows.Forms;

namespace HalkTvClient;

static class Program
{
    private const string MutexName = @"Global\HalkTvKiosk_SingleInstanceMutex";
    private static Mutex? _mutex;

    [STAThread]
    static void Main()
    {
        string logDirectory = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "HalkTvKiosk", "Logs");
        Directory.CreateDirectory(logDirectory);
        string logPath = Path.Combine(logDirectory, "startup.log");

        AppDomain.CurrentDomain.UnhandledException += (s, e) =>
        {
            File.AppendAllText(logPath, $"[{DateTime.Now}] AppDomain Unhandled: {e.ExceptionObject}\n");
        };

        Application.ThreadException += (s, e) =>
        {
            File.AppendAllText(logPath, $"[{DateTime.Now}] ThreadException: {e.Exception}\n");
        };

        try
        {
            File.WriteAllText(logPath, $"[{DateTime.Now}] Starting HalkTvKiosk...\n");

            _mutex = new Mutex(true, MutexName, out bool createdNew);
            File.AppendAllText(logPath, $"[{DateTime.Now}] Mutex createdNew: {createdNew}\n");

            if (!createdNew)
            {
                File.AppendAllText(logPath, $"[{DateTime.Now}] Another instance is already running. Exiting.\n");
                return;
            }

            Application.SetUnhandledExceptionMode(UnhandledExceptionMode.CatchException);
            ApplicationConfiguration.Initialize();
            File.AppendAllText(logPath, $"[{DateTime.Now}] Initializing TrayContext...\n");
            var context = new TrayContext();
            File.AppendAllText(logPath, $"[{DateTime.Now}] Running Application.Run...\n");
            Application.Run(context);
            File.AppendAllText(logPath, $"[{DateTime.Now}] Application.Run exited normally.\n");
        }
        catch (Exception ex)
        {
            File.AppendAllText(logPath, $"[{DateTime.Now}] FATAL ERROR in Main: {ex}\n");
        }
        finally
        {
            try { _mutex?.ReleaseMutex(); } catch { }
        }
    }
}

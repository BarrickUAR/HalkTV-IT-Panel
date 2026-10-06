using System;
using System.IO;

namespace HalkTvClient;

public static class ClientDiagnostics
{
    private static readonly object Sync = new();
    public static void Write(string operation, string result)
    {
        try
        {
            lock (Sync)
            {
                string directory = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "HalkTvKiosk", "Logs");
                Directory.CreateDirectory(directory);
                string file = Path.Combine(directory, "connection.log");
                if (File.Exists(file) && new FileInfo(file).Length > 256 * 1024)
                    File.Move(file, file + ".previous", true);
                File.AppendAllText(file, $"{DateTimeOffset.Now:O} {operation}: {result}\n");
            }
        }
        catch { }
    }
}

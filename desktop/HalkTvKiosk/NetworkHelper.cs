using System;
using System.Linq;
using System.Net;
using System.Net.NetworkInformation;
using System.Net.Sockets;

namespace HalkTvClient;

public static class NetworkHelper
{
    public static string GetHostname() => Environment.MachineName;

    public static string GetUsername() => Environment.UserName;

    public static (string ip, string mac) DetectLocalNetwork()
    {
        string localIp = "127.0.0.1";
        string mac = "Bilinmiyor";
        string fallbackIp = "";
        string fallbackMac = "";

        try
        {
            var interfaces = NetworkInterface.GetAllNetworkInterfaces()
                .Where(nic => nic.OperationalStatus == OperationalStatus.Up &&
                              nic.NetworkInterfaceType != NetworkInterfaceType.Loopback)
                .OrderByDescending(nic =>
                    nic.NetworkInterfaceType == NetworkInterfaceType.Ethernet ? 2 :
                    nic.NetworkInterfaceType == NetworkInterfaceType.Wireless80211 ? 1 : 0);

            foreach (var nic in interfaces)
            {
                string name = nic.Name.ToLowerInvariant();
                string desc = nic.Description.ToLowerInvariant();

                // Sanal veya konteyner bağdaştırıcılarını atla
                if (name.Contains("virtual") || name.Contains("vmware") || name.Contains("vethernet") ||
                    name.Contains("vbox") || name.Contains("docker") || name.Contains("wsl") ||
                    name.Contains("hyper-v") || name.Contains("bluetooth") || name.Contains("tap") ||
                    desc.Contains("virtual") || desc.Contains("vmware") || desc.Contains("hyper-v"))
                {
                    continue;
                }

                var ipProps = nic.GetIPProperties();
                foreach (var addr in ipProps.UnicastAddresses)
                {
                    if (addr.Address.AddressFamily == AddressFamily.InterNetwork)
                    {
                        string ipStr = addr.Address.ToString();
                        if (ipStr.StartsWith("169.254.")) continue; // APIPA geçersiz IP'leri atla

                        string macStr = string.Join(":", nic.GetPhysicalAddress()
                            .GetAddressBytes()
                            .Select(b => b.ToString("X2")));

                        // Kurumsal LAN aralıkları (192.168.x, 10.x, 172.16-31.x)
                        if (ipStr.StartsWith("192.168.") || ipStr.StartsWith("10.") ||
                            (ipStr.StartsWith("172.") && !ipStr.StartsWith("172.17.")))
                        {
                            return (ipStr, macStr);
                        }

                        if (string.IsNullOrEmpty(fallbackIp))
                        {
                            fallbackIp = ipStr;
                            fallbackMac = macStr;
                        }
                    }
                }
            }

            if (!string.IsNullOrEmpty(fallbackIp))
            {
                return (fallbackIp, fallbackMac);
            }
        }
        catch { }

        return (localIp, mac);
    }
}

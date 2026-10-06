import { NextResponse, NextRequest } from "next/server";
import net from "net";
import os from "os";

export const dynamic = "force-dynamic";

function getLocalIp(): string {
  try {
    const nets = os.networkInterfaces();
    let fallback = "";
    for (const name of Object.keys(nets)) {
      const lname = name.toLowerCase();
      if (
        lname.includes("virtual") ||
        lname.includes("vmware") ||
        lname.includes("vethernet") ||
        lname.includes("loopback") ||
        lname.includes("bluetooth") ||
        lname.includes("wsl") ||
        lname.includes("docker")
      ) {
        continue;
      }
      for (const item of nets[name] || []) {
        if (item.family === "IPv4" && !item.internal && !item.address.startsWith("169.254.")) {
          if (item.address.startsWith("192.168.") || item.address.startsWith("10.") || item.address.startsWith("172.")) {
            return item.address;
          }
          if (!fallback) fallback = item.address;
        }
      }
    }
    return fallback || "127.0.0.1";
  } catch {
    return "127.0.0.1";
  }
}

function checkTcp(host: string, port: number, timeoutMs = 1500): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(timeoutMs);

    socket.on("connect", () => {
      socket.destroy();
      resolve(true);
    });

    socket.on("timeout", () => {
      socket.destroy();
      resolve(false);
    });

    socket.on("error", () => {
      socket.destroy();
      resolve(false);
    });

    try {
      socket.connect(port, host);
    } catch {
      resolve(false);
    }
  });
}

export async function GET(req: NextRequest) {
  const customMarsis = req.nextUrl.searchParams.get("marsisUrl") || "http://news/";
  let marsisHost = "news";
  let marsisPort = 80;

  try {
    const urlObj = new URL(customMarsis);
    marsisHost = urlObj.hostname;
    marsisPort = urlObj.port ? parseInt(urlObj.port, 10) : 80;
  } catch {}

  const [marsisOk, internetOk, dnsOk] = await Promise.all([
    checkTcp(marsisHost, marsisPort, 1500),
    checkTcp("8.8.8.8", 53, 1500),
    checkTcp("1.1.1.1", 53, 1500),
  ]);

  const localIp = getLocalIp();
  const clientIp = req.nextUrl.searchParams.get("clientIp");
  const activeIp = clientIp && clientIp !== "—" && clientIp !== "127.0.0.1" ? clientIp : localIp;

  let dynamicGateway = "192.168.3.1";
  if (activeIp && activeIp.includes(".")) {
    const parts = activeIp.split(".");
    if (parts.length === 4) {
      dynamicGateway = `${parts[0]}.${parts[1]}.${parts[2]}.1`;
    }
  }

  return NextResponse.json({
    marsis: {
      ok: marsisOk,
      url: customMarsis,
      host: marsisHost,
      name: "Marsis Otomasyon Sistemi",
    },
    internet: {
      ok: internetOk || dnsOk,
    },
    localGateway: {
      ok: true,
      gateway: dynamicGateway,
    },
    localIp: activeIp,
    timestamp: new Date().toISOString(),
  });
}

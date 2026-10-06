const baseUrl = (process.argv[2] || "http://localhost:3000").replace(/\/$/, "");
const clients = Math.max(1, Math.min(500, Number(process.argv[3] || 120)));
const rounds = Math.max(1, Math.min(20, Number(process.argv[4] || 3)));

const latencies = [];
let failures = 0;
const started = Date.now();
for (let round = 0; round < rounds; round++) {
  await Promise.all(Array.from({ length: clients }, async () => {
    const requestStarted = performance.now();
    try {
      const response = await fetch(`${baseUrl}/api/health`, { cache: "no-store" });
      if (!response.ok) failures++;
      else await response.arrayBuffer();
    } catch { failures++; }
    latencies.push(performance.now() - requestStarted);
  }));
}
latencies.sort((a, b) => a - b);
const percentile = p => latencies[Math.min(latencies.length - 1, Math.floor(latencies.length * p))] || 0;
console.log(JSON.stringify({ baseUrl, clients, rounds, requests: clients * rounds, failures, elapsedMs: Date.now() - started, p50Ms: Math.round(percentile(.50)), p95Ms: Math.round(percentile(.95)), p99Ms: Math.round(percentile(.99)) }, null, 2));
if (failures) process.exitCode = 1;

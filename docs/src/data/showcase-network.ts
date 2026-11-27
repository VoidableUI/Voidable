// Sample data of the dashboard showcase: a fictional ground-station network
// ("Meridian") that talks to a small constellation. Everything is static and
// invented; the pages under /showcase/dashboard/ read it at build time.

export type NodeState = 'online' | 'degraded' | 'maintenance' | 'offline';

export interface NetworkNode {
  id: string;
  name: string;
  kind: 'Ground station' | 'Satellite';
  region: 'Arctic' | 'Southern' | 'Equatorial' | 'Polar orbit' | 'Inclined orbit';
  /** Coordinates of a station, orbit of a satellite. */
  where: string;
  state: NodeState;
  bands: string[];
  /** Round trip to the network core, ms. Null while the node is unreachable. */
  latency: number | null;
  /** Mbit/s through the node over the last five minutes. */
  throughput: number;
  /** Slant range of the link it is holding, km. Null with no link. */
  distance: number | null;
  uptime: number;
  peer: string;
  lastContact: string;
  firmware: string;
}

export const nodes: NetworkNode[] = [
  { id: 'GS-SVB1', name: 'Svalbard 1', kind: 'Ground station', region: 'Arctic', where: '78.23° N, 15.39° E', state: 'online', bands: ['S', 'X', 'Ka'], latency: 31, throughput: 842, distance: 1128, uptime: 99.98, peer: 'MRD-0412', lastContact: 'now', firmware: '4.18.2' },
  { id: 'GS-SVB2', name: 'Svalbard 2', kind: 'Ground station', region: 'Arctic', where: '78.23° N, 15.41° E', state: 'online', bands: ['S', 'X'], latency: 33, throughput: 615, distance: 1764, uptime: 99.95, peer: 'MRD-0398', lastContact: 'now', firmware: '4.18.2' },
  { id: 'GS-TOS1', name: 'Tromsø 1', kind: 'Ground station', region: 'Arctic', where: '69.66° N, 18.94° E', state: 'online', bands: ['S', 'X'], latency: 36, throughput: 574, distance: 912, uptime: 99.91, peer: 'MRD-0431', lastContact: 'now', firmware: '4.18.2' },
  { id: 'GS-TOS2', name: 'Tromsø 2', kind: 'Ground station', region: 'Arctic', where: '69.66° N, 18.96° E', state: 'degraded', bands: ['S', 'X'], latency: 118, throughput: 96, distance: 2240, uptime: 97.4, peer: 'MRD-0377', lastContact: '2 min ago', firmware: '4.18.2' },
  { id: 'GS-PUQ1', name: 'Punta Arenas', kind: 'Ground station', region: 'Southern', where: '53.16° S, 70.91° W', state: 'online', bands: ['X', 'Ka'], latency: 44, throughput: 731, distance: 1385, uptime: 99.91, peer: 'MRD-0420', lastContact: 'now', firmware: '4.18.1' },
  { id: 'GS-AWA1', name: 'Awarua', kind: 'Ground station', region: 'Southern', where: '46.53° S, 168.38° E', state: 'maintenance', bands: ['S', 'Ka'], latency: null, throughput: 0, distance: null, uptime: 98.72, peer: '—', lastContact: '3 h ago', firmware: '4.17.9' },
  { id: 'GS-TRL1', name: 'Troll', kind: 'Ground station', region: 'Southern', where: '72.01° S, 2.53° E', state: 'offline', bands: ['X'], latency: null, throughput: 0, distance: null, uptime: 91.03, peer: '—', lastContact: '47 min ago', firmware: '4.17.9' },
  { id: 'GS-SIN1', name: 'Singapore', kind: 'Ground station', region: 'Equatorial', where: '1.35° N, 103.82° E', state: 'online', bands: ['S', 'X'], latency: 52, throughput: 388, distance: 1942, uptime: 99.99, peer: 'MRD-0405', lastContact: 'now', firmware: '4.18.2' },
  { id: 'GS-MRU1', name: 'Mauritius', kind: 'Ground station', region: 'Equatorial', where: '20.17° S, 57.50° E', state: 'online', bands: ['S', 'X'], latency: 58, throughput: 342, distance: 1610, uptime: 99.82, peer: 'MRD-0431', lastContact: 'now', firmware: '4.18.2' },
  { id: 'GS-HBK1', name: 'Hartebeesthoek', kind: 'Ground station', region: 'Equatorial', where: '25.89° S, 27.69° E', state: 'online', bands: ['S', 'X', 'Ka'], latency: 49, throughput: 467, distance: 1206, uptime: 99.87, peer: 'MRD-0412', lastContact: 'now', firmware: '4.18.2' },
  { id: 'MRD-0412', name: 'MRD-0412', kind: 'Satellite', region: 'Polar orbit', where: '548 km, 97.6°', state: 'online', bands: ['S', 'X', 'Ka'], latency: 27, throughput: 842, distance: 1128, uptime: 99.99, peer: 'Svalbard 1', lastContact: 'now', firmware: '2.9.0' },
  { id: 'MRD-0398', name: 'MRD-0398', kind: 'Satellite', region: 'Polar orbit', where: '552 km, 97.6°', state: 'online', bands: ['S', 'X'], latency: 29, throughput: 615, distance: 1764, uptime: 99.97, peer: 'Svalbard 2', lastContact: 'now', firmware: '2.9.0' },
  { id: 'MRD-0377', name: 'MRD-0377', kind: 'Satellite', region: 'Polar orbit', where: '541 km, 97.5°', state: 'degraded', bands: ['S', 'Ka'], latency: 104, throughput: 96, distance: 2240, uptime: 98.61, peer: 'Tromsø 2', lastContact: '2 min ago', firmware: '2.8.4' },
  { id: 'MRD-0420', name: 'MRD-0420', kind: 'Satellite', region: 'Inclined orbit', where: '610 km, 53.0°', state: 'online', bands: ['X', 'Ka'], latency: 38, throughput: 731, distance: 1385, uptime: 99.93, peer: 'Punta Arenas', lastContact: 'now', firmware: '2.9.0' },
  { id: 'MRD-0431', name: 'MRD-0431', kind: 'Satellite', region: 'Inclined orbit', where: '606 km, 53.0°', state: 'online', bands: ['S', 'X'], latency: 41, throughput: 916, distance: 912, uptime: 99.96, peer: 'Tromsø 1', lastContact: 'now', firmware: '2.9.0' },
  { id: 'MRD-0405', name: 'MRD-0405', kind: 'Satellite', region: 'Inclined orbit', where: '612 km, 53.1°', state: 'online', bands: ['S', 'X'], latency: 46, throughput: 388, distance: 1942, uptime: 99.9, peer: 'Singapore', lastContact: 'now', firmware: '2.9.0' },
];

/** The whole network; the tables show the first page of it. */
export const totals = { nodes: 44, online: 41, degraded: 1, maintenance: 1, offline: 1, stations: 14, satellites: 30 };

export const stateColor: Record<NodeState, string | undefined> = {
  online: 'success',
  degraded: 'warning',
  maintenance: 'info',
  offline: 'error',
};

/** The three values `void-status-dot` draws. */
export const stateDot: Record<NodeState, 'online' | 'away' | 'offline'> = {
  online: 'online',
  degraded: 'away',
  maintenance: 'away',
  offline: 'offline',
};

export interface Link {
  satellite: string;
  station: string;
  band: 'S' | 'X' | 'Ka';
  state: 'nominal' | 'degraded' | 'down';
  latency: number | null;
  throughput: number;
  distance: number | null;
  loss: number | null;
  snr: number | null;
  elevation: number | null;
}

export const links: Link[] = [
  { satellite: 'MRD-0412', station: 'Svalbard 1', band: 'Ka', state: 'nominal', latency: 31, throughput: 842, distance: 1128, loss: 0.02, snr: 14.8, elevation: 27 },
  { satellite: 'MRD-0398', station: 'Svalbard 2', band: 'X', state: 'nominal', latency: 33, throughput: 615, distance: 1764, loss: 0.04, snr: 12.1, elevation: 14 },
  { satellite: 'MRD-0431', station: 'Tromsø 1', band: 'X', state: 'nominal', latency: 36, throughput: 574, distance: 912, loss: 0.01, snr: 15.6, elevation: 38 },
  { satellite: 'MRD-0377', station: 'Tromsø 2', band: 'S', state: 'degraded', latency: 118, throughput: 96, distance: 2240, loss: 2.31, snr: 6.2, elevation: 8 },
  { satellite: 'MRD-0420', station: 'Punta Arenas', band: 'Ka', state: 'nominal', latency: 44, throughput: 731, distance: 1385, loss: 0.03, snr: 13.4, elevation: 21 },
  { satellite: 'MRD-0405', station: 'Singapore', band: 'X', state: 'nominal', latency: 52, throughput: 388, distance: 1942, loss: 0.09, snr: 10.9, elevation: 12 },
  { satellite: 'MRD-0431', station: 'Mauritius', band: 'S', state: 'nominal', latency: 58, throughput: 342, distance: 1610, loss: 0.06, snr: 11.3, elevation: 17 },
  { satellite: 'MRD-0412', station: 'Hartebeesthoek', band: 'X', state: 'nominal', latency: 49, throughput: 467, distance: 1206, loss: 0.02, snr: 13.9, elevation: 25 },
  { satellite: 'MRD-0444', station: 'Svalbard 1', band: 'S', state: 'nominal', latency: 34, throughput: 212, distance: 1490, loss: 0.05, snr: 11.8, elevation: 19 },
  { satellite: 'MRD-0391', station: 'Troll', band: 'X', state: 'down', latency: null, throughput: 0, distance: null, loss: null, snr: null, elevation: null },
  { satellite: 'MRD-0452', station: 'Punta Arenas', band: 'X', state: 'nominal', latency: 47, throughput: 529, distance: 1672, loss: 0.04, snr: 12.5, elevation: 15 },
  { satellite: 'MRD-0368', station: 'Singapore', band: 'S', state: 'degraded', latency: 87, throughput: 148, distance: 2318, loss: 0.92, snr: 7.4, elevation: 7 },
];

export interface NetworkAlert {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  status: 'open' | 'acknowledged' | 'resolved';
  title: string;
  detail: string;
  node: string;
  started: string;
  duration: string;
  owner?: string;
}

export const alerts: NetworkAlert[] = [
  { id: 'INC-2291', severity: 'critical', status: 'open', title: 'Troll is unreachable', detail: 'No heartbeat for 47 minutes. The last telemetry showed the antenna controller restarting.', node: 'Troll', started: '11:02 UTC', duration: '47 min' },
  { id: 'INC-2290', severity: 'warning', status: 'open', title: 'Backup link engaged', detail: 'The primary fibre at Tromsø 2 dropped; traffic is on the microwave backup at about a tenth of the capacity.', node: 'Tromsø 2', started: '10:37 UTC', duration: '1 h 12 min' },
  { id: 'INC-2288', severity: 'warning', status: 'open', title: 'Packet loss above 0.5%', detail: 'MRD-0368 is below 10° of elevation over Singapore and the S-band link is losing frames.', node: 'MRD-0368', started: '11:31 UTC', duration: '18 min' },
  { id: 'INC-2284', severity: 'warning', status: 'acknowledged', title: 'Latency above the 100 ms threshold', detail: 'P99 round trip through Tromsø 2 has been above the threshold since the backup link took over.', node: 'Tromsø 2', started: '10:41 UTC', duration: '1 h 08 min', owner: 'Sarah Mitchell' },
  { id: 'INC-2279', severity: 'info', status: 'acknowledged', title: 'Antenna recalibration in progress', detail: 'Planned maintenance window. Passes were moved to Punta Arenas.', node: 'Awarua', started: '08:00 UTC', duration: '3 h 49 min', owner: 'Tom Anderson' },
  { id: 'INC-2271', severity: 'critical', status: 'resolved', title: 'Downlink stalled mid-pass', detail: 'The Ka-band demodulator lost lock for 96 seconds. The pass was repeated on the next orbit.', node: 'Punta Arenas', started: 'Yesterday, 22:14 UTC', duration: '9 min', owner: 'James Walker' },
  { id: 'INC-2266', severity: 'warning', status: 'resolved', title: 'Clock drift of 4 ms', detail: 'The station resynchronised with the reference after its receiver was power-cycled.', node: 'Mauritius', started: 'Yesterday, 16:50 UTC', duration: '26 min', owner: 'Emily Parker' },
  { id: 'INC-2259', severity: 'info', status: 'resolved', title: 'Firmware 4.18.2 rolled out', detail: 'All four Arctic stations restarted in turn with no missed pass.', node: 'Arctic region', started: 'Yesterday, 09:00 UTC', duration: '2 h 05 min', owner: 'Dan Roberts' },
];

export const openAlerts = alerts.filter((a) => a.status === 'open').length;

export const severityColor = { critical: 'error', warning: 'warning', info: 'info' } as const;

export interface LogLine {
  time: string;
  level: 'error' | 'warn' | 'info' | 'debug';
  source: string;
  message: string;
}

export const logs: LogLine[] = [
  { time: '11:49:12.408', level: 'info', source: 'Svalbard 1', message: 'pass MRD-0412 acquired, Ka-band lock in 1.8 s' },
  { time: '11:49:03.117', level: 'warn', source: 'MRD-0368', message: 'frame loss 0.92% over 60 s (threshold 0.50%)' },
  { time: '11:48:57.900', level: 'debug', source: 'scheduler', message: 'replanned 4 passes after capacity change at Tromsø 2' },
  { time: '11:48:41.266', level: 'error', source: 'Troll', message: 'heartbeat missed (94 in a row), marking node offline' },
  { time: '11:48:30.051', level: 'info', source: 'Punta Arenas', message: 'downlink complete: 18.4 GB in 9 min 12 s, 266 Mbit/s mean' },
  { time: '11:47:58.732', level: 'info', source: 'Tromsø 1', message: 'pass MRD-0431 handed over from Svalbard 2, slant range 912 km' },
  { time: '11:47:20.004', level: 'warn', source: 'Tromsø 2', message: 'round trip 118 ms on backup link (threshold 100 ms)' },
  { time: '11:46:44.619', level: 'debug', source: 'router', message: 'route table published, 41 nodes, 63 links' },
  { time: '11:46:02.380', level: 'info', source: 'Singapore', message: 'tracking MRD-0405, elevation 12°, X-band' },
  { time: '11:45:37.845', level: 'info', source: 'Awarua', message: 'recalibration step 6 of 9: azimuth sweep complete' },
  { time: '11:45:11.093', level: 'error', source: 'Troll', message: 'antenna controller did not answer on the management network' },
  { time: '11:44:52.501', level: 'info', source: 'Hartebeesthoek', message: 'pass MRD-0412 acquired, X-band lock in 2.3 s' },
  { time: '11:44:20.774', level: 'debug', source: 'scheduler', message: 'next conflict check in 300 s' },
  { time: '11:43:48.160', level: 'warn', source: 'Mauritius', message: 'rain fade margin down to 2.1 dB' },
  { time: '11:43:05.922', level: 'info', source: 'Svalbard 2', message: 'downlink complete: 11.7 GB in 7 min 40 s, 203 Mbit/s mean' },
  { time: '11:42:31.337', level: 'info', source: 'api', message: 'token mrd_live_9f2c…e41a listed 37 upcoming passes' },
];

export const levelColor = { error: 'error', warn: 'warning', info: 'info', debug: undefined } as const;

/* ── Series ───────────────────────────────────────────────────────── */

/** A repeatable wobble: the same inputs always give the same series. */
export function series(points: number, base: number, swing: number, seed: number, digits = 0): number[] {
  const f = 10 ** digits;
  return Array.from({ length: points }, (_, i) => {
    const wave = Math.sin((i + seed) * 0.9) * 0.55 + Math.sin((i + seed * 3) * 0.37) * 0.45;
    return Math.round((base + wave * swing) * f) / f;
  });
}

export const week = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** What each period of the analytics page plots: its labels and a seed. */
export const periods = {
  '24h': { label: 'Last 24 hours', labels: ['00:00', '03:00', '06:00', '09:00', '12:00', '15:00', '18:00', '21:00'], seed: 2 },
  '7d': { label: 'Last 7 days', labels: week, seed: 5 },
  '30d': { label: 'Last 30 days', labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5'], seed: 9 },
  '90d': { label: 'Last 90 days', labels: ['Sep', 'Oct', 'Nov'], seed: 13 },
} as const;

export type Period = keyof typeof periods;

export function analytics(period: Period) {
  const { labels, seed, label } = periods[period];
  const n = labels.length;
  return {
    label,
    latency: {
      labels,
      series: [
        { name: 'P99', values: series(n, 96, 22, seed) },
        { name: 'P95', values: series(n, 61, 9, seed + 1) },
        { name: 'P50', values: series(n, 38, 4, seed + 2) },
      ],
    },
    throughput: {
      labels,
      series: [
        { name: 'Downlink', values: series(n, 4.6, 0.9, seed + 4, 2) },
        { name: 'Uplink', values: series(n, 1.2, 0.3, seed + 6, 2) },
      ],
    },
    distance: {
      labels,
      series: [{ name: 'Mean slant range', values: series(n, 1480, 190, seed + 8) }],
    },
  };
}

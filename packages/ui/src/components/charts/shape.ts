/** SVG path for a polyline through points. */
export function linePath(points: Array<[number, number]>): string {
  if (points.length === 0) return '';
  return points
    .map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`)
    .join(' ');
}

/** SVG path for the filled area between a polyline and a baseline. */
export function areaPath(points: Array<[number, number]>, baseline: number): string {
  if (points.length === 0) return '';
  const top = points
    .map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`)
    .join(' ');
  const first = points[0]![0].toFixed(2);
  const last = points[points.length - 1]![0].toFixed(2);
  return `${top} L ${last} ${baseline.toFixed(2)} L ${first} ${baseline.toFixed(2)} Z`;
}

/** SVG path through points using monotone cubic interpolation (Fritsch–Carlson).
    Preserves monotonicity — the curve won't overshoot above local maxima or
    below local minima between data points. Output is a series of cubic Beziers. */
export function smoothLinePath(points: Array<[number, number]>): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0]![0].toFixed(2)} ${points[0]![1].toFixed(2)}`;
  if (points.length === 2) return linePath(points);

  const n = points.length;
  const m: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    const dx = points[i + 1]![0] - points[i]![0];
    const dy = points[i + 1]![1] - points[i]![1];
    m.push(dx === 0 ? 0 : dy / dx);
  }

  const t: number[] = new Array(n);
  t[0] = m[0]!;
  t[n - 1] = m[n - 2]!;
  for (let i = 1; i < n - 1; i++) {
    if (m[i - 1]! * m[i]! <= 0) t[i] = 0;
    else t[i] = (m[i - 1]! + m[i]!) / 2;
  }
  for (let i = 0; i < n - 1; i++) {
    if (m[i] === 0) { t[i] = 0; t[i + 1] = 0; continue; }
    const a = t[i]! / m[i]!;
    const b = t[i + 1]! / m[i]!;
    const h = a * a + b * b;
    if (h > 9) {
      const tau = 3 / Math.sqrt(h);
      t[i] = tau * a * m[i]!;
      t[i + 1] = tau * b * m[i]!;
    }
  }

  const parts: string[] = [`M ${points[0]![0].toFixed(2)} ${points[0]![1].toFixed(2)}`];
  for (let i = 0; i < n - 1; i++) {
    const [x0, y0] = points[i]!;
    const [x1, y1] = points[i + 1]!;
    const dx = (x1 - x0) / 3;
    const cp1x = x0 + dx;
    const cp1y = y0 + t[i]! * dx;
    const cp2x = x1 - dx;
    const cp2y = y1 - t[i + 1]! * dx;
    parts.push(`C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)} ${cp2x.toFixed(2)} ${cp2y.toFixed(2)} ${x1.toFixed(2)} ${y1.toFixed(2)}`);
  }
  return parts.join(' ');
}

/** SVG path for a smooth-curve area between a monotone cubic line and a baseline. */
export function smoothAreaPath(points: Array<[number, number]>, baseline: number): string {
  if (points.length === 0) return '';
  const top = smoothLinePath(points);
  const first = points[0]![0].toFixed(2);
  const last = points[points.length - 1]![0].toFixed(2);
  return `${top} L ${last} ${baseline.toFixed(2)} L ${first} ${baseline.toFixed(2)} Z`;
}

/** SVG path for a circular arc segment (donut/pie wedge). */
export function arcPath(
  cx: number,
  cy: number,
  outerR: number,
  startAngle: number,
  endAngle: number,
  innerR = 0,
): string {
  const rd = (n: number) => String(Number(n.toFixed(2)));
  // A full turn: an arc whose endpoints coincide draws nothing, and stopping
  // just short leaves a hairline seam (and, in an outlined ring, a radial
  // edge). Draw closed circles instead, two half arcs each; the inner one runs
  // the other way, so the nonzero fill leaves the hole empty.
  if (Math.abs(endAngle - startAngle) >= 2 * Math.PI - 1e-9) {
    const circle = (r: number, sweep: 0 | 1) => {
      const R = rd(r);
      const top = (cy - r).toFixed(2);
      const bottom = (cy + r).toFixed(2);
      return `M ${cx.toFixed(2)} ${top} A ${R} ${R} 0 1 ${sweep} ${cx.toFixed(2)} ${bottom} A ${R} ${R} 0 1 ${sweep} ${cx.toFixed(2)} ${top} Z`;
    };
    return innerR > 0 ? `${circle(outerR, 1)} ${circle(innerR, 0)}` : circle(outerR, 1);
  }
  const oR = rd(outerR);
  const x0 = cx + outerR * Math.cos(startAngle);
  const y0 = cy + outerR * Math.sin(startAngle);
  const x1 = cx + outerR * Math.cos(endAngle);
  const y1 = cy + outerR * Math.sin(endAngle);
  const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;

  if (innerR <= 0) {
    return `M ${cx} ${cy} L ${x0.toFixed(2)} ${y0.toFixed(2)} A ${oR} ${oR} 0 ${largeArc} 1 ${x1.toFixed(2)} ${y1.toFixed(2)} Z`;
  }

  const ix0 = cx + innerR * Math.cos(endAngle);
  const iy0 = cy + innerR * Math.sin(endAngle);
  const ix1 = cx + innerR * Math.cos(startAngle);
  const iy1 = cy + innerR * Math.sin(startAngle);
  return `M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${oR} ${oR} 0 ${largeArc} 1 ${x1.toFixed(2)} ${y1.toFixed(2)} L ${ix0.toFixed(2)} ${iy0.toFixed(2)} A ${rd(innerR)} ${rd(innerR)} 0 ${largeArc} 0 ${ix1.toFixed(2)} ${iy1.toFixed(2)} Z`;
}

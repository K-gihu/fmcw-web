export const C = 299792458;

export function cmap(n) {
  n = Math.max(0, Math.min(1, n));
  const stops = [
    [0, [6, 12, 40]],
    [0.25, [20, 80, 140]],
    [0.5, [34, 211, 238]],
    [0.75, [74, 222, 128]],
    [0.9, [250, 204, 21]],
    [1, [239, 68, 68]],
  ];
  for (let i = 0; i < stops.length - 1; i++) {
    if (n <= stops[i + 1][0]) {
      const a = stops[i];
      const b = stops[i + 1];
      const t = (n - a[0]) / (b[0] - a[0]);
      return [
        Math.round(a[1][0] + (b[1][0] - a[1][0]) * t),
        Math.round(a[1][1] + (b[1][1] - a[1][1]) * t),
        Math.round(a[1][2] + (b[1][2] - a[1][2]) * t),
      ];
    }
  }
  return [239, 68, 68];
}
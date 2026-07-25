export interface SeatPosition {
  seat_number: number;
  seat_label: string;
  relative_x: number;
  relative_y: number;
  rotation: number;
}

export function generateSeatPositions(
  shape: string,
  capacity: number,
  width: number,
  height: number,
): SeatPosition[] {
  const seats: SeatPosition[] = [];

  const distribute = (s: string, cap: number, w: number, h: number): SeatPosition[] => {
    const result: SeatPosition[] = [];

    switch (s) {
      case 'round':
      case 'sweetheart': {
        const radius = w / 2 + 14;
        for (let i = 0; i < cap; i++) {
          const angle = (i * 360 / cap - 90) * (Math.PI / 180);
          const rot = Math.round(((i * 360 / cap) + 180) % 360);
          result.push({
            seat_number: i + 1,
            seat_label: String(i + 1),
            relative_x: Math.round(radius * Math.cos(angle)),
            relative_y: Math.round(radius * Math.sin(angle)),
            rotation: rot,
          });
        }
        return result;
      }
      case 'oval': {
        const rx = w / 2 + 14;
        const ry = h / 2 + 14;
        for (let i = 0; i < cap; i++) {
          const angle = (i * 360 / cap - 90) * (Math.PI / 180);
          const rot = Math.round(((i * 360 / cap) + 180) % 360);
          result.push({
            seat_number: i + 1,
            seat_label: String(i + 1),
            relative_x: Math.round(rx * Math.cos(angle)),
            relative_y: Math.round(ry * Math.sin(angle)),
            rotation: rot,
          });
        }
        return result;
      }
      case 'square': {
        const surplus = cap % 4;
        const base = Math.floor(cap / 4);
        const top = base + (surplus > 0 ? 1 : 0);
        const right = base + (surplus > 1 ? 1 : 0);
        const bottom = base + (surplus > 2 ? 1 : 0);
        const left = base;
        const sides: { count: number; rot: number; xFn: (frac: number) => number; yFn: (frac: number) => number }[] = [
          { count: top, rot: 0, xFn: (f) => -halfW + halfW * 2 * f, yFn: () => -halfH },
          { count: right, rot: 90, xFn: () => halfW, yFn: (f) => -halfH + halfH * 2 * f },
          { count: bottom, rot: 180, xFn: (f) => halfW - halfW * 2 * f, yFn: () => halfH },
          { count: left, rot: 270, xFn: () => -halfW, yFn: (f) => halfH - halfH * 2 * f },
        ];

        let n = 1;
        const halfW = w / 2 + 14;
        const halfH = h / 2 + 14;
        for (const side of sides) {
          for (let i = 0; i < side.count; i++) {
            const frac = side.count > 1 ? (i + 0.5) / side.count : 0.5;
            result.push({
              seat_number: n,
              seat_label: String(n),
              relative_x: Math.round(side.xFn(frac)),
              relative_y: Math.round(side.yFn(frac)),
              rotation: side.rot,
            });
            n++;
          }
        }
        return result;
      }
      case 'banquet':
      case 'head_table': {
        const halfW = w / 2 + 14;
        const halfH = h / 2 + 14;
        const topCount = Math.ceil(cap / 2);
        const bottomCount = Math.floor(cap / 2);

        let n = 1;
        for (let i = 0; i < topCount; i++) {
          const frac = topCount > 1 ? (i + 0.5) / topCount : 0.5;
          result.push({
            seat_number: n,
            seat_label: String(n),
            relative_x: Math.round(-halfW + halfW * 2 * frac),
            relative_y: Math.round(-halfH),
            rotation: 0,
          });
          n++;
        }
        for (let i = 0; i < bottomCount; i++) {
          const frac = bottomCount > 1 ? (i + 0.5) / bottomCount : 0.5;
          result.push({
            seat_number: n,
            seat_label: String(n),
            relative_x: Math.round(halfW - halfW * 2 * frac),
            relative_y: Math.round(halfH),
            rotation: 180,
          });
          n++;
        }
        return result;
      }
      default:
        // fallback to round
        return distribute('round', cap, w, h);
    }
  };

  return distribute(shape, capacity, width, height);
}
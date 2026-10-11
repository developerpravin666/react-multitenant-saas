const HEX_COLOR = /^#([A-Fa-f0-9]{6})$/;

export function normalizeHexColor(value: string, fallback = "#4f46e5"): string {
  return HEX_COLOR.test(value) ? value : fallback;
}

export function darkenHex(hex: string, amount = 18): string {
  const safe = normalizeHexColor(hex).slice(1);
  const number = Number.parseInt(safe, 16);

  const clamp = (value: number) => Math.max(0, Math.min(255, value));

  const red = clamp((number >> 16) - amount);
  const green = clamp(((number >> 8) & 0x00ff) - amount);
  const blue = clamp((number & 0x0000ff) - amount);

  return `#${[red, green, blue]
    .map((channel) => channel.toString(16).padStart(2, "0"))
    .join("")}`;
}

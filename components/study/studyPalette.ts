export interface StudyPalette {
  background: string;
  text: string;
  muted: string;
  card: string;
  border: string;
  accent: string;
  accentSoft: string;
}

function rgb(hex: string): number[] {
  return [1, 3, 5].map((offset) => parseInt(hex.slice(offset, offset + 2), 16));
}

function luminance(channels: number[]): number {
  const linear = channels.map((channel) => {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
}

/** Ajusta solo el texto secundario para poder leerlo sobre todas las superficies. */
export function readableStudyPalette(palette: StudyPalette): StudyPalette {
  const surfaces = [palette.background, palette.card, palette.accentSoft];
  if (![...surfaces, palette.text, palette.muted].every((color) => /^#[\da-f]{6}$/i.test(color))) {
    return { ...palette, muted: palette.text };
  }
  const backgrounds = surfaces.map((color) => luminance(rgb(color)));
  const secondary = rgb(palette.muted);
  const primary = rgb(palette.text);
  for (let step = 0; step <= 10; step++) {
    const blended = secondary.map((channel, index) => Math.round(channel + (primary[index] - channel) * step / 10));
    const foreground = luminance(blended);
    const readable = backgrounds.every((background) =>
      (Math.max(foreground, background) + 0.05) / (Math.min(foreground, background) + 0.05) >= 4.6);
    if (readable) return { ...palette, muted: `#${blended.map((channel) => channel.toString(16).padStart(2, '0')).join('')}` };
  }
  return { ...palette, muted: palette.text };
}

export class ANSIArtRenderer {
  /**
   * Renders a buffer (or fallback procedural pattern) into 24-bit ANSI block art.
   * Terminal half-block character '▀' (top half) and '▄' (bottom half) allows 2 vertical pixels per char cell.
   */
  public static renderBufferToANSI(buffer: Buffer | undefined, width: number = 30, height: number = 15): string {
    if (!buffer || buffer.length === 0) {
      return this.renderFallbackArtwork(width, height);
    }

    // Procedural color sampling for extracted cover art
    const lines: string[] = [];
    const seed = buffer.reduce((acc, val) => (acc + val) % 255, 0);

    for (let y = 0; y < height; y++) {
      let line = '';
      for (let x = 0; x < width; x++) {
        const topR = Math.floor((Math.sin((x + y + seed) * 0.1) * 0.5 + 0.5) * 200 + 45);
        const topG = Math.floor((Math.cos((x * 0.15 + seed) * 0.1) * 0.5 + 0.5) * 150 + 50);
        const topB = Math.floor((Math.sin((y * 0.2 + seed) * 0.1) * 0.5 + 0.5) * 220 + 35);

        const botR = Math.floor((Math.cos((x + y) * 0.12) * 0.5 + 0.5) * 180 + 30);
        const botG = Math.floor((Math.sin((x * 0.2) * 0.1) * 0.5 + 0.5) * 200 + 20);
        const botB = Math.floor((Math.cos((y * 0.15) * 0.1) * 0.5 + 0.5) * 240 + 15);

        // 24-bit ANSI TrueColor escape sequences:
        // \x1b[38;2;R;G;Bm foreground (top)
        // \x1b[48;2;R;G;Bm background (bottom)
        line += `\x1b[38;2;${topR};${topG};${topB}m\x1b[48;2;${botR};${botG};${botB}m▀\x1b[0m`;
      }
      lines.push(line);
    }
    return lines.join('\n');
  }

  public static renderFallbackArtwork(width: number = 30, height: number = 15): string {
    const lines: string[] = [];
    for (let y = 0; y < height; y++) {
      let line = '';
      for (let x = 0; x < width; x++) {
        const distFromCenter = Math.sqrt(Math.pow(x - width / 2, 2) + Math.pow(y - height / 2, 2));
        const r = Math.floor((Math.sin(distFromCenter * 0.3) * 0.5 + 0.5) * 220 + 20);
        const g = Math.floor((Math.cos(distFromCenter * 0.2) * 0.5 + 0.5) * 120 + 40);
        const b = Math.floor((Math.sin(distFromCenter * 0.4) * 0.5 + 0.5) * 255);

        line += `\x1b[38;2;${r};${g};${b}m\x1b[48;2;${Math.floor(r * 0.4)};${Math.floor(g * 0.4)};${Math.floor(b * 0.4)}m▀\x1b[0m`;
      }
      lines.push(line);
    }
    return lines.join('\n');
  }
}

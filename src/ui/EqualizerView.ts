import blessed from 'neo-blessed';
import { AppStore } from '../store/AppStore.js';
import { EqualizerManager } from '../audio/EqualizerManager.js';
import { EQPreset } from '../types/index.js';
import { getTheme } from './Theme.js';

const BAR_HEIGHT = 12;   // max bar cells (±12 dB)
const BAND_WIDTH = 7;    // chars per band column
const BLOCK_FULL = '█';

function renderBars(gains: number[]): string[] {
  const lines: string[] = [];

  for (let row = BAR_HEIGHT; row >= -BAR_HEIGHT; row--) {
    let line = '';
    if (row === BAR_HEIGHT) {
      line += `{bold}{cyan-fg}+${BAR_HEIGHT}dB{/cyan-fg}{/bold} `;
    } else if (row === 0) {
      line += `{bold}{white-fg}  0dB{/white-fg}{/bold} `;
    } else if (row === -BAR_HEIGHT) {
      line += `{bold}{red-fg}-${BAR_HEIGHT}dB{/red-fg}{/bold} `;
    } else {
      line += '      ';
    }

    for (let b = 0; b < gains.length; b++) {
      const gain = Math.max(-BAR_HEIGHT, Math.min(BAR_HEIGHT, Math.round(gains[b])));
      let cell = ' '.repeat(BAND_WIDTH);

      if (gain >= 0) {
        if (row > 0 && row <= gain) {
          let color = 'green-fg';
          if (gain > 8) color = 'red-fg';
          else if (gain > 5) color = 'yellow-fg';
          cell = `{${color}}${BLOCK_FULL.repeat(BAND_WIDTH)}{/${color}}`;
        } else if (row === 0) {
          cell = `{white-fg}${'─'.repeat(BAND_WIDTH)}{/white-fg}`;
        }
      } else {
        if (row < 0 && row >= gain) {
          cell = `{blue-fg}${BLOCK_FULL.repeat(BAND_WIDTH)}{/blue-fg}`;
        } else if (row === 0) {
          cell = `{white-fg}${'─'.repeat(BAND_WIDTH)}{/white-fg}`;
        }
      }

      line += ' ' + cell;
    }

    lines.push(line);
  }

  return lines;
}

export class EqualizerView {
  private box: blessed.Widgets.BoxElement;
  private appStore: AppStore;
  private selectedBand: number = 0;

  constructor(parent: blessed.Widgets.BoxElement, appStore: AppStore) {
    this.appStore = appStore;
    const theme = getTheme(this.appStore.getConfig().theme);

    this.box = blessed.box({
      parent,
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      tags: true,
      keys: true,
      vi: false,
      style: {
        fg: theme.fg,
        bg: theme.bg,
      },
    });

    this.box.key(['left', 'h'], () => {
      this.selectedBand = Math.max(0, this.selectedBand - 1);
      this.refresh();
    });

    this.box.key(['right', 'l'], () => {
      this.selectedBand = Math.min(9, this.selectedBand + 1);
      this.refresh();
    });

    this.box.key(['up', 'k'], () => {
      this.getEQ().adjustBandGain(this.selectedBand, 1);
      this.syncEQ();
      this.refresh();
    });

    this.box.key(['down', 'j'], () => {
      this.getEQ().adjustBandGain(this.selectedBand, -1);
      this.syncEQ();
      this.refresh();
    });

    this.box.key(['f'], () => { this.applyPreset('flat'); });
    this.box.key(['b'], () => { this.applyPreset('bass_boost'); });
    this.box.key(['t'], () => { this.applyPreset('treble_boost'); });
    this.box.key(['e'], () => { this.applyPreset('electronic'); });
    this.box.key(['r'], () => { this.applyPreset('rock'); });
    this.box.key(['c'], () => { this.applyPreset('vocal'); });
    this.box.key(['o'], () => { this.applyPreset('lofi'); });
    this.box.key(['a'], () => { this.applyPreset('acoustic'); });

    this.box.key(['0'], () => {
      this.getEQ().setBandGain(this.selectedBand, 0);
      this.syncEQ();
      this.refresh();
    });

    this.box.key(['C-r'], () => {
      this.applyPreset('flat');
    });

    this.appStore.on('updated', () => {
      this.refresh();
    });

    this.refresh();
  }

  private getEQ(): EqualizerManager {
    return this.appStore.getEqualizerManager();
  }

  private applyPreset(preset: EQPreset): void {
    this.appStore.setEQPreset(preset);
    this.refresh();
  }

  private syncEQ(): void {
    this.appStore.applyCustomEQBands(this.getEQ().getGains());
  }

  public focus(): void {
    this.box.focus();
  }

  public updateTheme(): void {
    const theme = getTheme(this.appStore.getConfig().theme);
    this.box.style.fg = theme.fg;
    this.box.style.bg = theme.bg;
    this.refresh();
  }

  public refresh(): void {
    const eq = this.getEQ();
    const gains = eq.getGains();
    const bands = eq.getBands();
    const preset = eq.getPreset();

    const presetLabel = eq.getPresetList().find((p) => p.name === preset)?.label ?? preset;
    let content = `\n{center}{bold}{cyan-fg}═══ 10-Band Graphic Equalizer ═══{/cyan-fg}{/bold}{/center}\n`;
    content += `{center}{yellow-fg}Active Preset: ${presetLabel}{/yellow-fg}{/center}\n\n`;

    const barLines = renderBars(gains);
    content += barLines.join('\n');
    content += '\n';

    // Frequency labels row
    let freqRow = '      ';
    bands.forEach((band, i) => {
      const label = band.label.padStart(BAND_WIDTH);
      if (i === this.selectedBand) {
        freqRow += ` {bold}{yellow-fg}${label}{/yellow-fg}{/bold}`;
      } else {
        freqRow += ` {white-fg}${label}{/white-fg}`;
      }
    });
    content += freqRow + '\n';

    // Gain value row
    let gainRow = '      ';
    gains.forEach((g, i) => {
      const sign = g >= 0 ? '+' : '';
      const val = `${sign}${g}dB`.padStart(BAND_WIDTH);
      if (i === this.selectedBand) {
        gainRow += ` {bold}{green-fg}${val}{/green-fg}{/bold}`;
      } else {
        gainRow += ` {white-fg}${val}{/white-fg}`;
      }
    });
    content += gainRow + '\n\n';

    content += `{center}{gray-fg}`;
    content += `[←/→] Select Band  [↑/↓] ±1dB  [0] Reset Band  [Ctrl+R] Reset All\n`;
    content += `Presets: [f]lat  [b]ass  [t]reble  [e]lectronic  [r]ock  vo[c]al  l[o]-fi  [a]coustic`;
    content += `{/gray-fg}{/center}`;

    this.box.setContent(content);
  }
}

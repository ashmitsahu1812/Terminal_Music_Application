import blessed from 'neo-blessed';
import { AppStore } from '../store/AppStore.js';
import { ANSIArtRenderer } from '../parser/ANSIArtRenderer.js';
import { getTheme } from './Theme.js';

export class AlbumArtView {
  private box: blessed.Widgets.BoxElement;
  private artBox: blessed.Widgets.BoxElement;
  private detailsBox: blessed.Widgets.BoxElement;
  private appStore: AppStore;

  constructor(parent: blessed.Widgets.BoxElement, appStore: AppStore) {
    this.appStore = appStore;
    const theme = getTheme(this.appStore.getConfig().theme);

    this.box = blessed.box({
      parent,
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
    });

    this.artBox = blessed.box({
      parent: this.box,
      top: 0,
      left: 0,
      width: 36,
      height: '100%',
      label: ' Album Art ',
      border: { type: 'line' },
      style: {
        fg: theme.fg,
        bg: theme.bg,
        border: { fg: theme.borderFg },
      },
    });

    this.detailsBox = blessed.box({
      parent: this.box,
      top: 0,
      left: 36,
      width: '100%-36',
      height: '100%',
      label: ' Metadata & Audio Info ',
      border: { type: 'line' },
      tags: true,
      style: {
        fg: theme.fg,
        bg: theme.bg,
        border: { fg: theme.borderFg },
      },
    });

    this.refresh();

    this.appStore.on('updated', () => {
      this.refresh();
    });
  }

  public focus(): void {
    this.artBox.focus();
  }

  public updateTheme(): void {
    const theme = getTheme(this.appStore.getConfig().theme);
    this.artBox.style.fg = theme.fg;
    this.artBox.style.bg = theme.bg;
    if (this.artBox.style.border) this.artBox.style.border.fg = theme.borderFg;

    this.detailsBox.style.fg = theme.fg;
    this.detailsBox.style.bg = theme.bg;
    if (this.detailsBox.style.border) this.detailsBox.style.border.fg = theme.borderFg;

    this.refresh();
  }

  public refresh(): void {
    const state = this.appStore.getAudioEngine().getState();
    const track = state.currentTrack;

    if (!track) {
      this.artBox.setContent(ANSIArtRenderer.renderFallbackArtwork(32, 14));
      this.detailsBox.setContent('\n  {gray-fg}No track playing. Select a track in Library.{/gray-fg}');
      return;
    }

    // Render cover art
    this.artBox.setContent(
      ANSIArtRenderer.renderBufferToANSI(track.coverArt, 32, 14)
    );

    // Format metadata info
    const infoLines = [
      `{bold}{yellow-fg}TITLE:{/yellow-fg}{/bold}        ${track.title}`,
      `{bold}{yellow-fg}ARTIST:{/yellow-fg}{/bold}       ${track.artist}`,
      `{bold}{yellow-fg}ALBUM:{/yellow-fg}{/bold}        ${track.album}`,
      `{bold}{yellow-fg}GENRE:{/yellow-fg}{/bold}        ${track.genre || 'Unknown'}`,
      `{bold}{yellow-fg}YEAR:{/yellow-fg}{/bold}         ${track.year || 'Unknown'}`,
      `{bold}{yellow-fg}TRACK NO:{/yellow-fg}{/bold}     ${track.trackNumber || '-'}`,
      `{bold}{yellow-fg}DURATION:{/yellow-fg}{/bold}     ${this.formatTime(track.duration)}`,
      `{bold}{yellow-fg}BITRATE:{/yellow-fg}{/bold}      ${track.bitrate ? track.bitrate + ' kbps' : 'N/A'}`,
      `{bold}{yellow-fg}SAMPLE RATE:{/yellow-fg}{/bold}  ${track.sampleRate ? track.sampleRate + ' Hz' : 'N/A'}`,
      `{bold}{yellow-fg}FORMAT:{/yellow-fg}{/bold}       ${track.format}`,
      `{bold}{yellow-fg}FILE PATH:{/yellow-fg}{/bold}    ${track.filePath}`,
    ];

    this.detailsBox.setContent('\n  ' + infoLines.join('\n  '));
  }

  private formatTime(sec: number): string {
    const s = Math.floor(sec || 0);
    const m = Math.floor(s / 60);
    const rem = s % 60;
    return `${m}:${rem.toString().padStart(2, '0')}`;
  }
}

import blessed from 'neo-blessed';
import { AppStore } from '../store/AppStore.js';
import { Track } from '../types/index.js';
import { getTheme } from './Theme.js';

export class LibraryView {
  private listTable: blessed.Widgets.ListTableElement;
  private appStore: AppStore;
  private displayedTracks: Track[] = [];

  constructor(parent: blessed.Widgets.BoxElement, appStore: AppStore) {
    this.appStore = appStore;
    const theme = getTheme(this.appStore.getConfig().theme);

    this.listTable = blessed.listtable({
      parent,
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      align: 'left',
      tags: true,
      keys: true,
      vi: true,
      mouse: true,
      style: {
        header: {
          fg: theme.headerFg,
          bg: theme.headerBg,
          bold: true,
        },
        cell: {
          fg: theme.fg,
          selected: {
            fg: theme.highlightFg,
            bg: theme.highlightBg,
            bold: true,
          },
        },
        border: { fg: theme.borderFg },
      },
    });

    this.listTable.on('select', (item: any, index: number) => {
      const trackIndex = index - 1; // 0 is header row
      if (trackIndex >= 0 && trackIndex < this.displayedTracks.length) {
        const track = this.displayedTracks[trackIndex];
        this.appStore.playTrack(track);
      }
    });

    this.refresh();

    this.appStore.on('updated', () => {
      this.refresh();
    });
  }

  public focus(): void {
    this.listTable.focus();
  }

  public updateTheme(): void {
    const theme = getTheme(this.appStore.getConfig().theme);
    if (this.listTable.style.header) {
      this.listTable.style.header.fg = theme.headerFg;
      this.listTable.style.header.bg = theme.headerBg;
    }
    if (this.listTable.style.cell) {
      this.listTable.style.cell.fg = theme.fg;
      if (this.listTable.style.cell.selected) {
        this.listTable.style.cell.selected.fg = theme.highlightFg;
        this.listTable.style.cell.selected.bg = theme.highlightBg;
      }
    }
    this.refresh();
  }

  public getSelectedTrack(): Track | null {
    const selected = (this.listTable as any).selected;
    const index = selected - 1;
    if (index >= 0 && index < this.displayedTracks.length) {
      return this.displayedTracks[index];
    }
    return null;
  }

  public refresh(): void {
    this.displayedTracks = this.appStore.getTracks();
    const rows: string[][] = [
      ['#', 'Title', 'Artist', 'Album', 'Duration', 'Format'],
    ];

    if (this.displayedTracks.length === 0) {
      rows.push(['-', 'No tracks found in library', '-', '-', '-', '-']);
    } else {
      this.displayedTracks.forEach((track, idx) => {
        rows.push([
          (idx + 1).toString(),
          track.title,
          track.artist,
          track.album,
          this.formatDuration(track.duration),
          track.format,
        ]);
      });
    }

    this.listTable.setData(rows);
  }

  private formatDuration(sec: number): string {
    const s = Math.floor(sec || 0);
    const m = Math.floor(s / 60);
    const rem = s % 60;
    return `${m}:${rem.toString().padStart(2, '0')}`;
  }
}

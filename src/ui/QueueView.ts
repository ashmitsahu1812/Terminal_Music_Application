import blessed from 'neo-blessed';
import { AppStore } from '../store/AppStore.js';
import { Track } from '../types/index.js';
import { getTheme } from './Theme.js';

export class QueueView {
  private listTable: blessed.Widgets.ListTableElement;
  private appStore: AppStore;
  private queueTracks: Track[] = [];

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
      label: ' Up Next Queue (Press [J/K] or [Alt+Up/Down] to move item, [d] to remove) ',
      border: { type: 'line' },
      style: {
        header: { fg: theme.headerFg, bg: theme.headerBg, bold: true },
        cell: {
          fg: theme.fg,
          selected: { fg: theme.highlightFg, bg: theme.highlightBg, bold: true },
        },
        border: { fg: theme.borderFg },
      },
    });

    this.listTable.on('select', (item: any, index: number) => {
      const qIdx = index - 1;
      if (qIdx >= 0 && qIdx < this.queueTracks.length) {
        this.appStore.playQueueIndex(qIdx);
      }
    });

    // Handle keypresses for reordering and removing queue items
    this.listTable.on('keypress', (ch: any, key: any) => {
      const selected = (this.listTable as any).selected;
      const qIdx = selected - 1;

      if (key.name === 'd' || key.name === 'delete') {
        if (qIdx >= 0 && qIdx < this.queueTracks.length) {
          this.appStore.removeFromQueue(qIdx);
        }
      } else if (key.name === 'k' && key.shift) {
        // Move Up
        if (qIdx > 0) {
          this.appStore.moveQueueTrack(qIdx, qIdx - 1);
          (this.listTable as any).selected = qIdx; // preserve selection index
        }
      } else if (key.name === 'j' && key.shift) {
        // Move Down
        if (qIdx >= 0 && qIdx < this.queueTracks.length - 1) {
          this.appStore.moveQueueTrack(qIdx, qIdx + 1);
          (this.listTable as any).selected = qIdx + 2;
        }
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

  public refresh(): void {
    this.queueTracks = this.appStore.getQueue();
    const rows: string[][] = [
      ['#', 'Title', 'Artist', 'Album', 'Duration'],
    ];

    if (this.queueTracks.length === 0) {
      rows.push(['-', 'Queue is empty (Add tracks from Library or using :queue add)', '-', '-', '-']);
    } else {
      this.queueTracks.forEach((t, i) => {
        const m = Math.floor(t.duration / 60);
        const s = Math.floor(t.duration % 60);
        rows.push([
          (i + 1).toString(),
          t.title,
          t.artist,
          t.album,
          `${m}:${s.toString().padStart(2, '0')}`,
        ]);
      });
    }

    this.listTable.setData(rows);
  }
}

import blessed from 'neo-blessed';
import { AppStore } from '../store/AppStore.js';
import { RadioStation } from '../types/index.js';
import { getTheme } from './Theme.js';

export class RadioView {
  private listTable: blessed.Widgets.ListTableElement;
  private appStore: AppStore;
  private displayedStations: RadioStation[] = [];

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
      const stationIndex = index - 1; // 0 is header row
      if (stationIndex >= 0 && stationIndex < this.displayedStations.length) {
        const station = this.displayedStations[stationIndex];
        this.appStore.playRadioStation(station);
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

  public getSelectedStation(): RadioStation | null {
    const selected = (this.listTable as any).selected;
    const index = selected - 1;
    if (index >= 0 && index < this.displayedStations.length) {
      return this.displayedStations[index];
    }
    return null;
  }

  public refresh(): void {
    this.displayedStations = this.appStore.getRadioStations();
    const rows: string[][] = [
      ['#', 'Station Name', 'Genre', 'Bitrate', 'Origin', 'Description'],
    ];

    if (this.displayedStations.length === 0) {
      rows.push(['-', 'No radio stations available', '-', '-', '-', '-']);
    } else {
      const currentTrack = this.appStore.getAudioEngine().getState().currentTrack;
      this.displayedStations.forEach((st, idx) => {
        const isCurrent = currentTrack && currentTrack.filePath === st.streamUrl;
        const prefix = isCurrent ? '📡 ▶ ' : '';
        rows.push([
          (idx + 1).toString(),
          `${prefix}${st.name}`,
          st.genre,
          st.bitrate || '128 kbps',
          st.country || 'Global',
          st.description,
        ]);
      });
    }

    this.listTable.setData(rows);
  }
}

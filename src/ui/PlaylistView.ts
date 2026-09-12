import blessed from 'neo-blessed';
import { AppStore } from '../store/AppStore.js';
import { Playlist, Track } from '../types/index.js';
import { getTheme } from './Theme.js';

export class PlaylistView {
  private box: blessed.Widgets.BoxElement;
  private playlistList: blessed.Widgets.ListElement;
  private trackTable: blessed.Widgets.ListTableElement;
  private appStore: AppStore;
  private playlists: Playlist[] = [];
  private selectedPlaylist: Playlist | null = null;
  private playlistTracks: Track[] = [];

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

    this.playlistList = blessed.list({
      parent: this.box,
      top: 0,
      left: 0,
      width: '30%',
      height: '100%',
      label: ' Playlists ',
      border: { type: 'line' },
      keys: true,
      vi: true,
      mouse: true,
      style: {
        fg: theme.fg,
        bg: theme.bg,
        border: { fg: theme.borderFg },
        selected: {
          fg: theme.highlightFg,
          bg: theme.highlightBg,
          bold: true,
        },
      },
    });

    this.trackTable = blessed.listtable({
      parent: this.box,
      top: 0,
      left: '30%',
      width: '70%',
      height: '100%',
      label: ' Tracks in Playlist ',
      border: { type: 'line' },
      keys: true,
      vi: true,
      mouse: true,
      tags: true,
      style: {
        header: { fg: theme.headerFg, bg: theme.headerBg, bold: true },
        cell: {
          fg: theme.fg,
          selected: { fg: theme.highlightFg, bg: theme.highlightBg, bold: true },
        },
        border: { fg: theme.borderFg },
      },
    });

    this.playlistList.on('select item', (item: any, index: number) => {
      if (index >= 0 && index < this.playlists.length) {
        this.selectedPlaylist = this.playlists[index];
        this.loadPlaylistTracks();
      }
    });

    this.trackTable.on('select', (item: any, index: number) => {
      const trackIdx = index - 1;
      if (trackIdx >= 0 && trackIdx < this.playlistTracks.length) {
        this.appStore.playTrack(this.playlistTracks[trackIdx]);
      }
    });

    this.refresh();

    this.appStore.on('updated', () => {
      this.refresh();
    });
  }

  public focus(): void {
    this.playlistList.focus();
  }

  public updateTheme(): void {
    const theme = getTheme(this.appStore.getConfig().theme);
    this.playlistList.style.fg = theme.fg;
    this.playlistList.style.bg = theme.bg;
    if (this.playlistList.style.border) this.playlistList.style.border.fg = theme.borderFg;
    if (this.playlistList.style.selected) {
      this.playlistList.style.selected.fg = theme.highlightFg;
      this.playlistList.style.selected.bg = theme.highlightBg;
    }
    this.refresh();
  }

  private loadPlaylistTracks(): void {
    if (!this.selectedPlaylist) {
      this.playlistTracks = [];
    } else {
      const allTracks = this.appStore.getAllTracks();
      this.playlistTracks = this.selectedPlaylist.trackIds
        .map((id) => allTracks.find((t) => t.id === id))
        .filter((t): t is Track => t !== undefined);
    }

    const rows: string[][] = [['#', 'Title', 'Artist', 'Duration']];
    if (this.playlistTracks.length === 0) {
      rows.push(['-', 'No tracks in playlist', '-', '-']);
    } else {
      this.playlistTracks.forEach((t, i) => {
        const m = Math.floor(t.duration / 60);
        const s = Math.floor(t.duration % 60);
        rows.push([(i + 1).toString(), t.title, t.artist, `${m}:${s.toString().padStart(2, '0')}`]);
      });
    }
    this.trackTable.setData(rows);
  }

  public refresh(): void {
    this.playlists = this.appStore.getPlaylists();
    const items = this.playlists.map(
      (p) => `${p.name} (${p.trackIds.length})`
    );
    this.playlistList.setItems(items.length > 0 ? items : ['No playlists (Use :playlist create)']);
    if (this.playlists.length > 0 && !this.selectedPlaylist) {
      this.selectedPlaylist = this.playlists[0];
    }
    this.loadPlaylistTracks();
  }
}

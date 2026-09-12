import blessed from 'neo-blessed';
import { AppStore } from '../store/AppStore.js';
import { LyricsEngine } from '../lyrics/LyricsEngine.js';
import { getTheme } from './Theme.js';
import { LyricLine } from '../types/index.js';

export class LyricsView {
  private box: blessed.Widgets.BoxElement;
  private appStore: AppStore;
  private cachedLyrics: Map<string, LyricLine[]> = new Map();
  private isFetching: boolean = false;
  private currentTrackId: string | null = null;

  constructor(parent: blessed.Widgets.BoxElement, appStore: AppStore) {
    this.appStore = appStore;
    const theme = getTheme(this.appStore.getConfig().theme);

    this.box = blessed.box({
      parent,
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      label: ' 🎤 Real-Time Synced Karaoke Lyrics (Tab 6) ',
      border: { type: 'line' },
      style: {
        fg: theme.fg,
        bg: theme.bg,
        border: { fg: theme.borderFg },
      },
      tags: true,
      scrollable: true,
      alwaysScroll: true,
      content: this.renderLyrics(),
    });

    this.appStore.on('updated', () => {
      this.checkAndFetchLyrics();
      this.box.setContent(this.renderLyrics());
      if (this.box.screen) this.box.screen.render();
    });

    this.appStore.on('position', () => {
      this.box.setContent(this.renderLyrics());
      if (this.box.screen) this.box.screen.render();
    });
  }

  public focus(): void {
    this.box.focus();
  }

  public updateTheme(): void {
    const theme = getTheme(this.appStore.getConfig().theme);
    this.box.style.fg = theme.fg;
    this.box.style.bg = theme.bg;
    if (this.box.style.border) this.box.style.border.fg = theme.borderFg;
    this.box.setContent(this.renderLyrics());
  }

  private async checkAndFetchLyrics(): Promise<void> {
    const state = this.appStore.getAudioEngine().getState();
    const track = state.currentTrack;
    if (!track) return;

    if (this.currentTrackId === track.id) return;
    this.currentTrackId = track.id;

    // Check memory cache
    if (this.cachedLyrics.has(track.id)) return;

    if (!this.isFetching) {
      this.isFetching = true;
      try {
        const lyrics = await this.appStore.getLyricsCacheManager().getLyricsForTrack(track);
        if (lyrics && lyrics.length > 0) {
          this.cachedLyrics.set(track.id, lyrics);
          track.lyrics = lyrics;
          this.box.setContent(this.renderLyrics());
          if (this.box.screen) this.box.screen.render();
        }
      } catch {}
      this.isFetching = false;
    }
  }

  private renderLyrics(): string {
    const state = this.appStore.getAudioEngine().getState();
    const track = state.currentTrack;

    if (!track) {
      return `\n\n  {gray-fg}No track currently playing.{/gray-fg}\n  {cyan-fg}Select a track in the Library (1) to start karaoke lyrics sync.{/cyan-fg}`;
    }

    const lyrics = this.cachedLyrics.get(track.id) || track.lyrics;

    if (!lyrics || lyrics.length === 0) {
      const status = this.isFetching ? 'Fetching synced lyrics online from LRCLIB...' : 'No synced lyrics found.';
      return (
        `\n  {bold}${track.title}{/bold} - ${track.artist}\n\n` +
        `  {yellow-fg}${status}{/yellow-fg}\n\n` +
        `  {gray-fg}💡 Tip: Place a matching {bold}${track.fileName.replace(/\.[^/.]+$/, '')}.lrc{/bold} file beside your song{/gray-fg}\n` +
        `  {gray-fg}   or type {bold}:lyrics fetch{/bold} in command palette.{/gray-fg}`
      );
    }

    const activeIndex = LyricsEngine.getActiveIndex(lyrics, state.position);
    const lines: string[] = [];

    lines.push(`  {bold}{magenta-fg}🎤 LIVE KARAOKE SYNC{/magenta-fg}{/bold} │ {bold}${track.title}{/bold} - ${track.artist}\n`);

    // Window around active index
    const totalLines = lyrics.length;
    const visibleCount = 14;
    let start = Math.max(0, activeIndex - Math.floor(visibleCount / 2));
    let end = Math.min(totalLines, start + visibleCount);

    if (end - start < visibleCount) {
      start = Math.max(0, end - visibleCount);
    }

    for (let i = start; i < end; i++) {
      const item = lyrics[i];
      const timeStr = this.formatTime(item.time);

      if (i === activeIndex) {
        lines.push(`  {bold}{yellow-fg}▶ [${timeStr}]  {underline}${item.text}{/underline} ♫{/yellow-fg}{/bold}`);
      } else if (i < activeIndex) {
        lines.push(`  {gray-fg}  [${timeStr}]  ${item.text}{/gray-fg}`);
      } else {
        lines.push(`  {white-fg}  [${timeStr}]  ${item.text}{/white-fg}`);
      }
    }

    return lines.join('\n');
  }

  private formatTime(sec: number): string {
    const s = Math.floor(sec || 0);
    const m = Math.floor(s / 60);
    const rem = s % 60;
    return `${m.toString().padStart(2, '0')}:${rem.toString().padStart(2, '0')}`;
  }
}

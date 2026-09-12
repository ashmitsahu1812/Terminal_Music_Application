import blessed from 'neo-blessed';
import { AppStore } from '../store/AppStore.js';
import { getTheme } from './Theme.js';

export class StatsView {
  private box: blessed.Widgets.BoxElement;
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
      tags: true,
      keys: true,
      scrollable: true,
      alwaysScroll: true,
      scrollbar: {
        ch: '│',
        style: { fg: theme.accentFg },
      },
      style: {
        fg: theme.fg,
        bg: theme.bg,
      },
    });

    // Refresh on 'r' key
    this.box.key(['r'], () => {
      this.refresh();
    });

    this.appStore.on('updated', () => {
      this.refresh();
    });

    this.refresh();
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
    const stats = this.appStore.getStatsManager().getStats();
    const sm = this.appStore.getStatsManager();

    const hr = '{bold}{cyan-fg}' + '─'.repeat(70) + '{/cyan-fg}{/bold}';

    let content = `\n`;
    content += `{center}{bold}{magenta-fg}╔══════════════════════════════════════════╗{/magenta-fg}{/bold}{/center}\n`;
    content += `{center}{bold}{magenta-fg}║   🎵  Listening Analytics Dashboard   ║{/magenta-fg}{/bold}{/center}\n`;
    content += `{center}{bold}{magenta-fg}╚══════════════════════════════════════════╝{/magenta-fg}{/bold}{/center}\n\n`;

    // Overview Cards Row
    content += `{center}`;
    content += `{bold}{yellow-fg}Total Plays{/yellow-fg}{/bold}         {bold}{green-fg}Listen Time{/green-fg}{/bold}         {bold}{cyan-fg}Today{/cyan-fg}{/bold}           {bold}{blue-fg}Streak{/blue-fg}{/bold}\n`;
    content += `{bold}  ${String(stats.totalTrackPlays).padEnd(17)}{/bold}`;
    content += `{bold}  ${sm.formatDuration(stats.totalListenSeconds).padEnd(17)}{/bold}`;
    content += `{bold}  ${sm.formatDuration(stats.todayListenSeconds).padEnd(15)}{/bold}`;
    content += `{bold}  🔥 ${stats.streakDays} day${stats.streakDays !== 1 ? 's' : ''}{/bold}\n`;
    content += `{/center}\n`;

    content += `{center}{gray-fg}${stats.uniqueTracksPlayed} unique tracks played in total{/gray-fg}{/center}\n\n`;

    // Top Tracks Table
    content += `{bold}{yellow-fg}  🏆 Most Played Tracks{/yellow-fg}{/bold}\n`;
    content += `${hr}\n`;
    content += `{bold}{white-fg}  # │ Plays │ Listen Time  │ Last Played         │ Title – Artist{/white-fg}{/bold}\n`;
    content += `${hr}\n`;

    if (stats.topTracks.length === 0) {
      content += `{gray-fg}  No tracks played yet. Start listening!\n{/gray-fg}`;
    } else {
      stats.topTracks.slice(0, 15).forEach((rec, i) => {
        const rank = String(i + 1).padStart(2);
        const plays = String(rec.playCount).padStart(5);
        const listenTime = sm.formatDuration(rec.totalListenSeconds).padEnd(12);
        const lastDate = new Date(rec.lastPlayedAt).toLocaleDateString('en-US', {
          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
        }).padEnd(19);
        const title = rec.title.length > 30 ? rec.title.slice(0, 27) + '…' : rec.title;
        const artist = rec.artist || 'Unknown';

        let rankColor = 'white-fg';
        if (i === 0) rankColor = 'yellow-fg';
        else if (i === 1) rankColor = 'white-fg';
        else if (i === 2) rankColor = 'red-fg';

        content += `{${rankColor}}  ${rank} │ {/yellow-fg}{bold}${plays}{/bold}{${rankColor}} │ ${listenTime} │ {gray-fg}${lastDate}{/gray-fg} │ {bold}${title}{/bold}{${rankColor}} – {italic}${artist}{/italic}\n`;
      });
    }

    content += `\n`;

    // Recent Sessions
    content += `{bold}{cyan-fg}  🕐 Recent Sessions{/cyan-fg}{/bold}\n`;
    content += `${hr}\n`;
    content += `{bold}{white-fg}  Time              │ Duration │ Track{/white-fg}{/bold}\n`;
    content += `${hr}\n`;

    if (stats.recentSessions.length === 0) {
      content += `{gray-fg}  No sessions recorded yet.\n{/gray-fg}`;
    } else {
      stats.recentSessions.forEach((session) => {
        const time = new Date(session.startedAt).toLocaleString('en-US', {
          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
        }).padEnd(18);
        const dur = sm.formatDuration(session.durationSeconds).padEnd(8);
        const trackName = session.title.length > 35 ? session.title.slice(0, 32) + '…' : session.title;
        const artist = session.artist || 'Unknown';
        content += `  {gray-fg}${time}{/gray-fg} │ {green-fg}${dur}{/green-fg} │ {bold}${trackName}{/bold} – {italic}${artist}{/italic}\n`;
      });
    }

    content += `\n{center}{gray-fg}[r] Refresh  [:stats clear] Clear All Stats{/gray-fg}{/center}`;

    this.box.setContent(content);
  }
}

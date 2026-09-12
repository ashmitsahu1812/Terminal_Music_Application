export interface ThemeColors {
  name: string;
  fg: string;
  bg: string;
  borderFg: string;
  headerFg: string;
  headerBg: string;
  accentFg: string;
  highlightFg: string;
  highlightBg: string;
  progressFg: string;
  progressBg: string;
  statusPlayingFg: string;
  statusPausedFg: string;
  statusStoppedFg: string;
}

export const THEMES: Record<string, ThemeColors> = {
  cyberpunk: {
    name: 'cyberpunk',
    fg: 'cyan',
    bg: 'black',
    borderFg: 'magenta',
    headerFg: 'yellow',
    headerBg: 'black',
    accentFg: 'magenta',
    highlightFg: 'black',
    highlightBg: 'cyan',
    progressFg: 'magenta',
    progressBg: 'black',
    statusPlayingFg: 'green',
    statusPausedFg: 'yellow',
    statusStoppedFg: 'red',
  },
  synthwave: {
    name: 'synthwave',
    fg: 'magenta',
    bg: 'black',
    borderFg: 'yellow',
    headerFg: 'cyan',
    headerBg: 'black',
    accentFg: 'yellow',
    highlightFg: 'black',
    highlightBg: 'magenta',
    progressFg: 'yellow',
    progressBg: 'black',
    statusPlayingFg: 'cyan',
    statusPausedFg: 'yellow',
    statusStoppedFg: 'red',
  },
  chroma: {
    name: 'chroma',
    fg: 'white',
    bg: 'black',
    borderFg: 'cyan',
    headerFg: 'magenta',
    headerBg: 'black',
    accentFg: 'yellow',
    highlightFg: 'black',
    highlightBg: 'magenta',
    progressFg: 'cyan',
    progressBg: 'black',
    statusPlayingFg: 'green',
    statusPausedFg: 'yellow',
    statusStoppedFg: 'red',
  },
  matrix: {
    name: 'matrix',
    fg: 'green',
    bg: 'black',
    borderFg: 'green',
    headerFg: 'lightgreen',
    headerBg: 'black',
    accentFg: 'green',
    highlightFg: 'black',
    highlightBg: 'green',
    progressFg: 'green',
    progressBg: 'black',
    statusPlayingFg: 'lightgreen',
    statusPausedFg: 'yellow',
    statusStoppedFg: 'red',
  },
  nord: {
    name: 'nord',
    fg: 'white',
    bg: 'black',
    borderFg: 'blue',
    headerFg: 'cyan',
    headerBg: 'black',
    accentFg: 'blue',
    highlightFg: 'black',
    highlightBg: 'cyan',
    progressFg: 'cyan',
    progressBg: 'black',
    statusPlayingFg: 'green',
    statusPausedFg: 'yellow',
    statusStoppedFg: 'red',
  },
  dark: {
    name: 'dark',
    fg: 'white',
    bg: 'black',
    borderFg: 'gray',
    headerFg: 'white',
    headerBg: 'black',
    accentFg: 'white',
    highlightFg: 'black',
    highlightBg: 'white',
    progressFg: 'gray',
    progressBg: 'black',
    statusPlayingFg: 'green',
    statusPausedFg: 'yellow',
    statusStoppedFg: 'red',
  },
  monochrome: {
    name: 'monochrome',
    fg: 'white',
    bg: 'black',
    borderFg: 'white',
    headerFg: 'white',
    headerBg: 'black',
    accentFg: 'white',
    highlightFg: 'black',
    highlightBg: 'white',
    progressFg: 'white',
    progressBg: 'black',
    statusPlayingFg: 'white',
    statusPausedFg: 'white',
    statusStoppedFg: 'white',
  },
};

export function getTheme(themeName: string): ThemeColors {
  return THEMES[themeName] || THEMES.cyberpunk;
}

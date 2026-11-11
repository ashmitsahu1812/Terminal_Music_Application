const { spawn } = require("child_process")
const fs = require("fs")

// ANSI color codes for terminal styling
const C = {
    reset: '\x1b[0m', bold: '\x1b[1m', dim: '\x1b[2m',
    cyan: '\x1b[36m', green: '\x1b[32m', yellow: '\x1b[33m',
    magenta: '\x1b[35m', red: '\x1b[31m', white: '\x1b[37m',
    bgBlue: '\x1b[44m', clearScr: '\x1b[2J\x1b[H',
}

// Box-drawing characters
const B = {
    tl: '╔', tr: '╗', bl: '╚', br: '╝',
    h: '═', v: '║', ml: '╠', mr: '╣',
}

const songsPath = "./songs"
const songs = fs.readdirSync(songsPath).filter(el => el.endsWith(".mp3") || el.endsWith(".aiff"))

let childProcess = null
let selected = 1
let nowPlaying = null
let nowPlayingIndex = null
let isPaused = false
let statusMsg = ''
let totalSongs = songs.length

const WIDTH = 64

const pad = (str, len) => {
    const clean = str.replace(/\x1b\[[0-9;]*m/g, '')
    const diff = len - clean.length
    return str + ' '.repeat(Math.max(0, diff))
}

const center = (str, len) => {
    const clean = str.replace(/\x1b\[[0-9;]*m/g, '')
    const total = len - clean.length
    const left = Math.max(0, Math.floor(total / 2))
    const right = Math.max(0, total - left)
    return ' '.repeat(left) + str + ' '.repeat(right)
}

const hLine = (l, r, fill) => l + fill.repeat(WIDTH + 2) + r

const progressBar = (current, total, width = 30) => {
    const filled = Math.floor((current / total) * width)
    const empty = width - filled
    return `${C.green}${'▓'.repeat(filled)}${C.dim}${'░'.repeat(empty)}${C.reset}`
}

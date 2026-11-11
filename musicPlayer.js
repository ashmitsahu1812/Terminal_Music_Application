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

const render = () => {
    const out = []
    out.push(C.clearScr)
    out.push(C.cyan + C.bold + hLine(B.tl, B.tr, B.h) + C.reset)
    const title = `${C.yellow}${C.bold}♫  TERMINAL MUSIC PLAYER  ♫${C.reset}`
    out.push(C.cyan + B.v + C.reset + center(title, WIDTH + 2) + C.cyan + B.v + C.reset)
    out.push(C.cyan + C.bold + hLine(B.ml, B.mr, B.h) + C.reset)
    const playlistHeader = ` ${C.magenta}${C.bold}PLAYLIST${C.reset} ${C.dim}(${songs.length} songs)${C.reset}`
    out.push(C.cyan + B.v + C.reset + pad(playlistHeader, WIDTH + 1) + C.cyan + B.v + C.reset)
    out.push(C.cyan + B.v + C.reset + pad('', WIDTH + 1) + C.cyan + B.v + C.reset)

    songs.forEach((song, i) => {
        const num = i + 1
        const name = song.replace(/\.[^/.]+$/, '')
        const isSelected = selected === num
        const isPlaying = nowPlayingIndex === num
        let line
        if (isSelected && isPlaying) {
            const marker = `${C.green}${C.bold} ${isPaused ? '⏸' : '♫'}  ${num < 10 ? '0' + num : num}. ${C.reset}`
            const text = `${C.bgBlue}${C.bold}${C.white} ${pad(name, WIDTH - 9)} ${C.reset}`
            line = marker + text
        } else if (isPlaying) {
            const marker = `${C.green}${C.bold} ${isPaused ? '⏸' : '♫'}  ${num < 10 ? '0' + num : num}. ${C.reset}`
            const text = `${C.green}${pad(name, WIDTH - 8)}${C.reset}`
            line = marker + text
        } else if (isSelected) {
            const marker = `${C.cyan}${C.bold} ▶  ${num < 10 ? '0' + num : num}. ${C.reset}`
            const text = `${C.bgBlue}${C.bold}${C.white} ${pad(name, WIDTH - 9)} ${C.reset}`
            line = marker + text
        } else {
            const marker = `${C.dim}    ${num < 10 ? '0' + num : num}. ${C.reset}`
            const text = `${C.white}${pad(name, WIDTH - 7)}${C.reset}`
            line = marker + text
        }
        out.push(C.cyan + B.v + C.reset + ' ' + line + C.cyan + B.v + C.reset)
    })

    out.push(C.cyan + B.v + C.reset + pad('', WIDTH + 1) + C.cyan + B.v + C.reset)
    out.push(C.cyan + C.bold + hLine(B.ml, B.mr, B.h) + C.reset)

    if (nowPlaying) {
        const icon = isPaused ? '⏸  ' : '▶  '
        const state = isPaused ? `${C.yellow}${C.bold}PAUSED${C.reset}` : `${C.green}${C.bold}PLAYING${C.reset}`
        const npHeader = ` ${C.bold}${C.white}NOW PLAYING${C.reset}  ${icon}${state}`
        out.push(C.cyan + B.v + C.reset + pad(npHeader, WIDTH + 1) + C.cyan + B.v + C.reset)
        const npName = ` ${C.yellow}${C.bold}${nowPlaying}${C.reset}`
        out.push(C.cyan + B.v + C.reset + pad(npName, WIDTH + 1) + C.cyan + B.v + C.reset)
        const progress = ` ${progressBar(nowPlayingIndex, totalSongs, 40)}  ${C.dim}${nowPlayingIndex}/${totalSongs}${C.reset}`
        out.push(C.cyan + B.v + C.reset + pad(progress, WIDTH + 1) + C.cyan + B.v + C.reset)
    } else {
        const npText = ` ${C.dim}♫ No song playing — press ${C.yellow}↵${C.reset}${C.dim} to start${C.reset}`
        out.push(C.cyan + B.v + C.reset + pad(npText, WIDTH + 1) + C.cyan + B.v + C.reset)
        out.push(C.cyan + B.v + C.reset + pad('', WIDTH + 1) + C.cyan + B.v + C.reset)
        out.push(C.cyan + B.v + C.reset + pad('', WIDTH + 1) + C.cyan + B.v + C.reset)
    }

    if (statusMsg) {
        out.push(C.cyan + B.v + C.reset + pad('', WIDTH + 1) + C.cyan + B.v + C.reset)
        const smText = ` ${C.magenta}ℹ  ${statusMsg}${C.reset}`
        out.push(C.cyan + B.v + C.reset + pad(smText, WIDTH + 1) + C.cyan + B.v + C.reset)
    }

    out.push(C.cyan + C.bold + hLine(B.ml, B.mr, B.h) + C.reset)
    const controlsLine1 = [`${C.yellow}${C.bold}↑↓${C.reset} Navigate`, `${C.yellow}${C.bold}↵${C.reset} Play`, `${C.yellow}${C.bold}N${C.reset} Next`, `${C.yellow}${C.bold}B${C.reset} Prev`].join(`  ${C.dim}·${C.reset}  `)
    const controlsLine2 = [`${C.yellow}${C.bold}P${C.reset} Pause`, `${C.yellow}${C.bold}R${C.reset} Resume`, `${C.yellow}${C.bold}Q${C.reset} Quit`].join(`  ${C.dim}·${C.reset}  `)
    out.push(C.cyan + B.v + C.reset + center(controlsLine1, WIDTH + 2) + C.cyan + B.v + C.reset)
    out.push(C.cyan + B.v + C.reset + center(controlsLine2, WIDTH + 2) + C.cyan + B.v + C.reset)
    out.push(C.cyan + C.bold + hLine(B.bl, B.br, B.h) + C.reset)
    process.stdout.write(out.join('\n') + '\n')
}

const playSong = (index) => {
    const song = songs[index - 1]
    if (!song) return
    if (childProcess) childProcess.kill()
    selected = index
    nowPlayingIndex = index
    isPaused = false
    nowPlaying = song.replace(/\.[^/.]+$/, '')
    statusMsg = `♫ Now playing track ${index} of ${totalSongs}`
    childProcess = spawn('afplay', [`${songsPath}/${song}`])
    childProcess.on('close', () => {
        if (!isPaused) {
            nowPlaying = null
            nowPlayingIndex = null
            statusMsg = `✓ Finished: ${song.replace(/\.[^/.]+$/, '')}`
            render()
            if (selected < songs.length) {
                setTimeout(() => { playSong(selected + 1) }, 500)
            } else {
                statusMsg = '🎵 Playlist complete! Press ↵ to replay or Q to quit'
                render()
            }
        }
    })
    render()
}

const playNext = () => {
    if (nowPlayingIndex && nowPlayingIndex < songs.length) {
        playSong(nowPlayingIndex + 1)
    } else if (selected < songs.length) {
        playSong(selected + 1)
    } else {
        statusMsg = '⚠  Already at last song'
        render()
    }
}

const playPrevious = () => {
    if (nowPlayingIndex && nowPlayingIndex > 1) {
        playSong(nowPlayingIndex - 1)
    } else if (selected > 1) {
        playSong(selected - 1)
    } else {
        statusMsg = '⚠  Already at first song'
        render()
    }
}

const pause = () => {
    if (childProcess && !isPaused && childProcess.pid) {
        try {
            process.kill(childProcess.pid, 'SIGSTOP')
            isPaused = true
            statusMsg = '⏸  Paused'
            render()
        } catch (err) {
            statusMsg = '⚠  Pause failed'
            render()
        }
    }
}

const resume = () => {
    if (childProcess && isPaused && childProcess.pid) {
        try {
            process.kill(childProcess.pid, 'SIGCONT')
            isPaused = false
            statusMsg = '▶  Resumed'
            render()
        } catch (err) {
            statusMsg = '⚠  Resume failed'
            render()
        }
    }
}

render()
process.stdin.setEncoding('utf-8')
process.stdin.setRawMode(true)

process.stdin.on('data', (key) => {
    const keyStr = key.toString()
    if (keyStr === '\x1b[A' || key[2] === 'A') {
        if (selected > 1) {
            selected--
            statusMsg = ''
            render()
        }
        return
    }
    if (keyStr === '\x1b[B' || key[2] === 'B') {
        if (selected < songs.length) {
            selected++
            statusMsg = ''
            render()
        }
        return
    }
    const input = key.trim().toString()
    if (key === '\r' || key === '\n') {
        playSong(selected)
        return
    }
    if (input === 'q' || input === 'exit') {
        if (childProcess) childProcess.kill()
        process.stdout.write(C.clearScr)
        process.stdout.write(`${C.yellow}👋  Thanks for listening. Bye!${C.reset}\n\n`)
        process.stdin.setRawMode(false)
        process.exit(0)
        return
    }
    if (input === 'p') { pause(); return }
    if (input === 'r') { resume(); return }
    if (input === 'n') { playNext(); return }
    if (input === 'b') { playPrevious(); return }
    const num = parseInt(input)
    if (!isNaN(num) && num >= 1 && num <= songs.length) {
        selected = num
        playSong(num)
    }
})

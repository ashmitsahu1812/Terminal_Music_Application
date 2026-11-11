const { spawn } = require("child_process")
const fs = require("fs")

const songsPath = "./songs"
const songs = fs.readdirSync(songsPath).filter(el => el.endsWith(".mp3") || el.endsWith(".aiff"))

let childProcess = null
let selected = 1
let nowPlaying = null
let nowPlayingIndex = null
let isPaused = false
let statusMsg = ''
let totalSongs = songs.length

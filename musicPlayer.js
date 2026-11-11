const { spawn } = require("child_process")
const fs = require("fs")

const songsPath = "./songs"
const songs = fs.readdirSync(songsPath).filter(el => el.endsWith(".mp3") || el.endsWith(".aiff"))

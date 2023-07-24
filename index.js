import {
  Browsers,
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  fetchLatestWaWebVersion
} from '@whiskeysockets/baileys';
import {
  makeWASocket,
  protoType,
  serialize
} from './lib/simple.js';
import {
  readdirSync,
  existsSync,
  statSync,
  unlinkSync,
  readFileSync,
  watch
} from 'fs';
import { platform } from 'process'
import chalk from "chalk";
import figlet from "figlet";
import pino from "pino";
import { Boom } from "@hapi/boom";
import { fileURLToPath, pathToFileURL } from 'url';
import { join } from 'path'
import path from 'path'
import { tmpdir } from 'os'
import { format } from 'util';
import syntaxerror from 'syntax-error';
import lodash from 'lodash'
import * as ws from 'ws';
const { CONNECTING } = ws
const { chain } = lodash;
import { Low, JSONFile } from 'lowdb';

console.log(chalk.green('Connecting bot...'));

protoType()
serialize()

const color = (text, color) => {
  return !color ? chalk.green(text) : chalk[color](text);
};

const Figlet = (text) => {
  return figlet.textSync(
    text, {
      font: "Standard",
      horizontalLayout: "default",
      vertivalLayout: "default",
      whitespaceBreak: false
    }
  );
}

global.__filename = function filename(pathURL = import.meta.url, rmPrefix = platform !== 'win32') { return rmPrefix ? /file:\/\/\//.test(pathURL) ? fileURLToPath(pathURL) : pathURL : pathToFileURL(pathURL).toString() }; global.__dirname = function dirname(pathURL) { return path.dirname(global.__filename(pathURL, true)) }; global.__require = function require(dir = import.meta.url) { return createRequire(dir) } 

global.prefix = new RegExp('^[' + '‎z/i!#$%+£¢€¥^°=¶∆×÷π√✓©®:;?&.,\\-'.replace(/[|\\{}()[\]^$+*?.\-\^]/g, '\\$&') + ']')

global.db = new Low(new JSONFile(`$database.json`));

global.loadDatabase = async function loadDatabase() {
  if (global.db.READ) return new Promise((resolve) => setInterval(async function () {
    if (!global.db.READ) {
      clearInterval(this)
      resolve(global.db.data == null ? global.loadDatabase() : global.db.data)
    }
  }, 1 * 1000))
  if (global.db.data !== null) return
  global.db.READ = true
  await global.db.read().catch(console.error)
  global.db.READ = null
  global.db.data = {
    msgs: {},
    sticker: {},
    ...(global.db.data || {})
  }
  global.db.chain = chain(global.db.data)
}
loadDatabase()

const __dirname = global.__dirname(import.meta.url)

//const { state, saveCreds } = await store.useSingleFileAuthState('./session.json');
const { state, saveCreds } = await useMultiFileAuthState('./session');

const connectionOptions = {
  logger: pino({ level: "silent" }),
  printQRInTerminal: true,
  browser: Browsers.macOS('Desktop'),
  auth: state,
}

global.conn = makeWASocket(connectionOptions)
conn.isInit = false

async function clearTmp() {
  const tmp = [tmpdir(), join(__dirname, './tmp')]
  const filename = []
  tmp.forEach(dirname => readdirSync(dirname).forEach(file => filename.push(join(dirname, file))))

  return filename.map(file => {
    const stats = statSync(file)
    if (stats.isFile() && (Date.now() - stats.mtimeMs >= 1000 * 60 * 1)) return unlinkSync(file) // 1 menit
    return false
  })
}
setInterval(async () => {
  try {
  	var a = await clearTmp()
	  console.log(chalk.cyan(`✅ Berhasil membersihian tmp`))
	} catch {
	  console.log(chalk.cyan('❌ Gagal menghapus tmp'))
	}
}, 60000) //1 menit

let connectionUpdate = async (update) => {
  const { connection, lastDisconnect, isNewLogin } = update
  if (isNewLogin) conn.isInit = true
  const code = lastDisconnect?.error?.output?.statusCode || lastDisconnect?.error?.output?.payload?.statusCode
  if (code && code !== DisconnectReason.loggedOut && conn?.ws.readyState !== CONNECTING) {
    console.log(await global.reloadHandler(true).catch(console.error))
    global.timestamp.connect = new Date
  }
  if (global.db.data == null) loadDatabase()
}

let isInit = true
let handle = await import('./handle.js')
global.reloadHandler = async (restatConn) => {
  try {
    const Handle = await import(`./handle.js?update=${Date.now()}`).catch(console.error)
    if (Object.keys(Handle || {}).length) handle = Handle
  } catch (e) {
    console.error(e)
  }
  if (restatConn) {
    const oldChats = global.conn.chats
    try { global.conn.ws.close() } catch { }
    conn.ev.removeAllListeners()
    global.conn = makeWASocket(connectionOptions, { chats: oldChats })
    isInit = true
  }
  if (!isInit) {
    conn.ev.off('messages.upsert', conn.handle)
    conn.ev.off('group-participants.update', conn.pUpdate)
    conn.ev.off('groups.update', conn.gUpdate)
    conn.ev.off('connection.update', connectionUpdate)
    conn.ev.off('creds.update', saveCreds)
  }

  conn.handle = handle.ChatUpdate.bind(global.conn)
  conn.pUpdate = handle.ParticipantsUpdate.bind(global.conn)
  conn.gUpdate = handle.GroupsUpdate.bind(global.conn)

  conn.ev.on('messages.upsert', conn.handle)
  conn.ev.on('group-participants.update', conn.pUpdate)
  conn.ev.on('groups.update', conn.gUpdate)
  conn.ev.on('connection.update', connectionUpdate)
  conn.ev.on('creds.update', saveCreds)
  isInit = false
  return true
}

const pluginFolder = global.__dirname(join(__dirname, './plugins/index'))
const pluginFilter = filename => /\.js$/.test(filename)
global.plugins = {}
async function filesInit() {
  for (let filename of readdirSync(pluginFolder).filter(pluginFilter)) {
    try {
      let file = global.__filename(join(pluginFolder, filename))
      const module = await import(file)
      global.plugins[filename] = module.default || module
    } catch (e) {
      conn.logger.error(e)
      delete global.plugins[filename]
    }
  }
}
filesInit().then(_ => console.log(Object.keys(global.plugins))).catch(console.error)

global.reload = async (_ev, filename) => {
  if (pluginFilter(filename)) {
    let dir = global.__filename(join(pluginFolder, filename), true)
    if (filename in global.plugins) {
      if (existsSync(dir)) conn.logger.info(` updated plugin - '${filename}'`)
      else {
        conn.logger.warn(`deleted plugin - '${filename}'`)
        return delete global.plugins[filename]
      }
    } else conn.logger.info(`new plugin - '${filename}'`)
    let err = syntaxerror(readFileSync(dir), filename, {
      sourceType: 'module',
      allowAwaitOutsideFunction: true
    })
    if (err) conn.logger.error(`syntax error while loading '${filename}'\n${format(err)}`)
    else try {
      const module = (await import(`${global.__filename(dir)}?update=${Date.now()}`))
      global.plugins[filename] = module.default || module
    } catch (e) {
      conn.logger.error(`error require plugin '${filename}\n${format(e)}'`)
    } finally {
      global.plugins = Object.fromEntries(Object.entries(global.plugins).sort(([a], [b]) => a.localeCompare(b)))
    }
  }
}
Object.freeze(global.reload)
watch(pluginFolder, global.reload)
await global.reloadHandler()
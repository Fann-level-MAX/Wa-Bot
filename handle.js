import { smsg } from './lib/simple.js'
import { format } from 'util'
import { fileURLToPath } from 'url'
import { join } from 'path'
import path from 'path';
import fs from 'fs'
import chalk from 'chalk'
import moment from 'moment-timezone'

export async function ChatUpdate(chatUpdate) {
  this.msgqueque = this.msgqueque || [];
  if (!chatUpdate) return;
  this.pushMessage(chatUpdate.messages).catch(console.error);
  const m = chatUpdate.messages[chatUpdate.messages.length - 1];
  if (!m) return;
  if (global.db.data == null) await global.loadDatabase();
  try {
    const Message = smsg(this, m) || m;
    if (!Message) return;
    if (Message.isBaileys) return;
    const groupMetadata = (Message.isGroup? (conn.chats[Message.chat] || {}).metadata || await this.groupMetadata(Message.chat).catch(_ => null) : {}) || {};
    const participants = (Message.isGroup ? groupMetadata.participants : []) || [];
    const user = (Message.isGroup ? participants.find(u => conn.decodeJid(u.id) === Message.sender) : {}) || {};
    const bot = (Message.isGroup ? participants.find(u => conn.decodeJid(u.id) == this.user.jid) : {}) || {};
    const isRAdmin = user?.admin === 'superadmin' || false;
    const isAdmin = isRAdmin || user?.admin === 'admin' || false;
    const isBotAdmin = bot?.admin || false;
    const ___dirname = path.join(path.dirname(fileURLToPath(import.meta.url)), './plugins');
    for (const [name, plugin] of Object.entries(global.plugins)) {
      if (!plugin || plugin.disabled) continue;
      const __filename = path.join(___dirname, name);
      if (typeof plugin.all === 'function') {
        try {
          await plugin.all.call(this, Message, {
            chatUpdate,
            __dirname: ___dirname,
            __filename,
          });
        } catch (e) {
          console.error(e);
        }
      }
      const str2Regex = str => str.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&');
      const _prefix = plugin.customPrefix || conn.prefix || global.prefix;
      const match = (_prefix instanceof RegExp? [[_prefix.exec(Message.text), _prefix]]:Array.isArray(_prefix)? _prefix.map(p=>{
        const re = p instanceof RegExp? p:new RegExp(str2Regex(p));
        return [re.exec(Message.text), re];
      }):[[[], new RegExp]]).find(p => p[1]);
      if (typeof plugin.before === 'function') {
        const beforeResult = await plugin.before.call(this, Message, {
          match,
          conn: this,
          participants,
          groupMetadata,
          user,
          bot,
          isRAdmin,
          isAdmin,
          isBotAdmin,
          chatUpdate,
          __dirname: ___dirname,
          __filename,
        });
        if (beforeResult) continue;
      }
      if (typeof plugin !== 'function') continue;
      if (match[0]) {
        const usedPrefix = match[0][0];
        const noPrefix = Message.text.replace(usedPrefix, '');
        const [command, ...args] = noPrefix.trim().split(' ').filter(v => v);
        const _args = noPrefix.trim().split(' ').slice(1);
        const text = _args.join(' ');
        const lowerCaseCommand = command.toLowerCase();
        const fail = plugin.fail || global.dfail;
        const isAccept = plugin.command instanceof RegExp? plugin.command.test(lowerCaseCommand):Array.isArray(plugin.command)? plugin.command.some(cmd => (cmd instanceof RegExp? cmd.test(lowerCaseCommand):cmd === lowerCaseCommand)):typeof plugin.command === 'string'? plugin.command === lowerCaseCommand:false;
        if (!isAccept) continue;
        if (plugin.rowner && plugin.owner && !(isROwner || isOwner)) {
          fail('owner', Message, this);
          continue;
        }
        if (plugin.rowner && !isROwner) {
          fail('rowner', Message, this);
          continue;
        }
        if (plugin.owner && !isOwner) {
          fail('owner', Message, this);
          continue;
        }
        if (plugin.group && !Message.isGroup) {
          fail('group', Message, this);
          continue;
        } else if (plugin.botAdmin && !isBotAdmin) {
          fail('botAdmin', Message, this);
          continue;
        } else if (plugin.admin && !isAdmin) {
          fail('admin', Message, this);
          continue;
        }
        Message.isCommand = true;
        const extra = {
          match,
          usedPrefix,
          noPrefix,
          _args,
          args,
          command,
          text,
          conn: this,
          participants,
          groupMetadata,
          user,
          bot,
          isRAdmin,
          isAdmin,
          isBotAdmin,
          chatUpdate,
          __dirname: ___dirname,
          __filename,
        };
        try {
          await plugin.call(this, Message, extra);
        } catch (e) {
          Message.error = e;
          console.error(e);
          if (e) {
            let text = format(e);
            for (const key of Object.values(global.APIKeys)) {
              text = text.replace(new RegExp(key, 'g'), '#HIDDEN#');
            }
            Message.reply(text);
          }
        } finally {
          if (typeof plugin.after === 'function') {
            try {
              await plugin.after.call(this, Message, extra);
            } catch (e) {
              console.error(e);
            }
          }
        }
        break;
      }
    }
  } catch (e) {
    console.error(e);
  }
}

/**
 * Handle groups participants update
 * @param {import('@adiwajshing/baileys').BaileysEventMap<unknown>['group-participants.update']} groupsUpdate 
 */
export async function ParticipantsUpdate({ id, participants, action }) {
  if (this.isInit) return
  function getFullDateAndTimeWIB() {
  const now = moment().tz('Asia/Jakarta');
  return now.format('YYYY-MM-DD_HH:mm:ss');
  }
  try {
  const fileDescriptor = fs.openSync('./log/group-participants.txt', 'a');
  for (let user of participants){
    fs.writeSync(fileDescriptor, `\t${getFullDateAndTimeWIB()} | ${await this.getName(id)} | +${user.split('@')[0]} | ${action}\n`)
    fs.closeSync(fileDescriptor)
  }
  } catch (error) {
  console.error(error)
  }
}

/**
 * Handle groups update
 * @param {import('@adiwajshing/baileys').BaileysEventMap<unknown>['groups.update']} groupsUpdate 
 */
export async function GroupsUpdate(groupsUpdate) {
  for (const groupUpdate of groupsUpdate) {
    if(!groupUpdate.id)continue
    //if (!id) continue
    //console.log(groupUpdate)
  }
}

global.dfail = (type, m, conn) => {
  let msg = {
    rowner: '👑 This command can only be used by the *Creator of the bot*',
    owner: '🔱 This command can only be used by the *Bot Owner*',
    group: '⚙️ This command can only be used in groups!',
    admin: '🛡️ This command is only for *Group Admins*',
    botAdmin: '💥 To use this command I must be *Administrator!*',
  }[type]
  if (msg) return m.reply(msg)
}

let file = global.__filename(import.meta.url, true)
fs.watchFile(file, async () => {
  fs.unwatchFile(file)
  console.log(chalk.magenta("✅ updated 'handler.js'"))
  if (global.reloadHandler) console.log(await global.reloadHandler())
}) 
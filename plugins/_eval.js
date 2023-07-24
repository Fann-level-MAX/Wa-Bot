import fs from 'fs';
import { youtubedl, youtubedlv2 } from '@bochilteam/scraper-sosmed';
let handler = async (m, {
  conn,
  text,
  participants,
  groupMetadata,
  user,
  bot,
  isRAdmin,
  isAdmin,
  isBotAdmin
}) => {
  eval(`(async()=>{${text}})();`);
}

handler.command = ['eval', 'execute']

export default handler
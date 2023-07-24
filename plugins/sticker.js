import { sticker6 } from '../lib/sticker.js';
let handler = async (m, { conn }) => {
  let img, mime;
  if (m.quoted) {
    img = m.quoted;
    mime = m.quoted.mimetype;
  } else {
    img = m;
    mime = m.msg.mimetype;
  };
  try {
    await img.download();
  } catch {
    return m.reply('foto/video nya mana?');
  };
  if (mime !== 'image/webp') {
    if (mime.includes('video')&&((img.msg||img).seconds>11)){
      return m.reply('batas durasi video hanyalah 11 detik');
    };
    conn.sendMessage(m.chat, {
      sticker: await sticker6(await img.download())
    }, {
      quoted: m,
      ephemeralExpiration: '86400'
    });
  } else {
    return m.reply('coba lagi dengan foto/video');
  };
}
handler.command = ['s']
export default handler
import { savefrom } from '@bochilteam/scraper-sosmed';
let handler = async(m, { conn, text }) => {
  if(!text)return m.reply('linknya mana?');
  try {
    let _= await savefrom(text)!
    const long = _[0].meta.title.split('');
    conn.sendMessage(m.chat, {
      caption: long.length>23?long.slice(0, 23).join('')+String.fromCharCode(8206).repeat(4001)+long.slice(23, long.length).join(''):long.join(''),
      video: { url: _[0].url[0].url }
    }, {
      quoted: m,
      ephemeralExpiration: '86400'
    });
  } catch {
    m.reply('terjadi kesalahan\nmungkin kamu salah link?');
  };
}
handler.command = ['ig', 'instagram']
export default handler
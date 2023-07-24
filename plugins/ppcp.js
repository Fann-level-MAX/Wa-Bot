import axios from 'axios';
let handler = async(m,{ conn, text }) => {
  let _= await axios.get('https://saipulanuar.cf/api/random/couple');
  let send = (url, caption, quoted) => conn.sendMessage(m.chat, {
    image: { url },
    caption
  }, {
    ephemeralExpiration: '86400',
    quoted
  });
  let anu;
  anu = await send(_.data.result.male, 'untuk cowo', m);
  setTimeout(function(){
    send(_.data.result.female, 'untuk cewe', anu);
  }, 800);
}
handler.command = ['ppcp']
export default handler
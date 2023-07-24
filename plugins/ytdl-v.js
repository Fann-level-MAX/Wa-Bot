import fetch from 'node-fetch';
import fs from 'fs';
import { youtubedl } from '@bochilteam/scraper-sosmed';
let handler = async (m,{ conn, args }) => {
  function yt_parser(url){
    let regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    let match = url.match(regExp);
    return (match&&match[7].length==11)? match[7] : false;
  }
  let fix = (txt, yes = false) => {
  let number = Number(txt);
  if (number >= 1000000000) {
    return back((number / 1000000000).toFixed(1).replace('.', ',') + 'M', yes, txt);
  } else if (number >= 1000000) {
    return back((number / 1000000).toFixed(1).replace('.', ',') + 'jt', yes, txt);
  } else if (number >= 1000) {
    return back((number / 1000).toFixed(1).replace('.', ',') + 'rb', yes, txt);
  } else {
    return number.toString();
  }
};

function back(text, yes, txt) {
  return `*${text}* ${yes ? ' kali ' : ''}    (${txt.replace(/\B(?=(\d{3})+(?!\d))/g, ".")})`;
}
    //return txt.replace(/\B(?=(\d{3})+(?!\d))/g, ".")

  let parsed = yt_parser(args[0]);
  if(parsed==false)return m.reply('link tersebut tidak terlihat seperti link video YT');
  let json = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=contentDetails%2Csnippet%2Cstatistics&id=${parsed}&key=AIzaSyCmuYwEU0ANgwy8oBmd41IiM1wQOqrR-GQ`).then(_=>_.json());
  var anu;
  if(json.pageInfo.totalResults==0)return m.reply(`terjadi kesalahan.\nvideo dengan ID (${parsed})\ntidak ditemukan di YouTube`);
  let item = json.items[0];
  //console.log(json.items[0])
  let caption = `*${item.snippet.title}*
ditonton :    ${fix(item.statistics.viewCount,true)}
jumlah like :    ${fix(item.statistics.likeCount)}
durasi video :  *${item.contentDetails.duration.replace('PT','').replace('H','Jam ').replace('M','Menit ').replace('S','Detik')}*
video url :  *youtu.be/${item.id}*
creator :  *${item.snippet.channelTitle}*
(ytch.rf.gd/?to=${item.snippet.channelId})`;
  let send = conn.sendMessage(m.chat, {
    image: {url: item.snippet.thumbnails.medium.url },
    caption
  }, {
    quoted: m,
    ephemeralExpiration: '86400'
  });
  anu = await send
  //console.log(anu)
  let Send = (url) => {
    conn.sendMessage(m.chat, {
      video: {url}
    }, {
      quoted: anu,
      ephemeralExpiration: '86400'
    });
  };
  youtubedl(args[0]).then(async(_)=>{
    try {
    if(args[1]){
      if(args[1]=='1080p'||args[1]=='720p'||args[1]=='360p'||args[1]=='144p'){
        Send(await _.video[args[1]].download());
      } else {
        return m.reply('pemilihan kualitas salah,\nhanya 1080p, 720p, 360p, dan 144p yang tersedia');
      };
    } else {
      Send(await _.video['360p'].download());
    };
    } catch(err) {
      return m.reply('sepertinya terdapat error disaat pengunduhan video\ncobalah untuk mengatur kualitas secara manual.\n*.yt <URL> <kualitas>*');
    };
  });
}

handler.command = ['yt']

export default handler
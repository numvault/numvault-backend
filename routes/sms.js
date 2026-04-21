function formatServiceName(code) {
  const names = {
    'tg':'Telegram','wa':'WhatsApp','vk':'VK','vi':'Viber',
    'fb':'Facebook','ig':'Instagram','tw':'Twitter/X','go':'Google',
    'yt':'YouTube','am':'Amazon','ap':'Apple','ms':'Microsoft',
    'nf':'Netflix','sp':'Spotify','tt':'TikTok','li':'LinkedIn',
    'dc':'Discord','ub':'Uber','ok':'OK.ru','sk':'Skype',
    'wc':'WeChat','sn':'Snapchat','rd':'Reddit','pp':'PayPal',
    'tb':'Tumblr','ln':'Line','kk':'KakaoTalk','zl':'Zalo',
    'im':'IMO','sg':'Signal','bm':'Bumble','td':'Tinder',
    'bd':'Badoo','st':'Steam','tx':'Twitch','gh':'GitHub',
    'bn':'Binance','cb':'Coinbase','by':'Bybit','ds':'DS',
    'dh':'DoorDash','lf':'Lyft','pt':'Pinterest','df':'Deezer',
    'hw':'Hulu','kc':'KuCoin','nv':'Nvidia','ab':'Alibaba',
    'bz':'Bezos','bw':'BlaBlaCar','fu':'FuturePay',
    'mm':'MegaFon','mb':'МТС','uk':'Ukrtelecom',
    'zr':'Zara','ls':'Lazada','me':'Meesho',
  };
  return names[code] || code.toUpperCase();
}

function getCountryName(code) {
  const names = {
    'ru':'Russia','ua':'Ukraine','kz':'Kazakhstan','cn':'China',
    'ph':'Philippines','mm':'Myanmar','id':'Indonesia','my':'Malaysia',
    'ke':'Kenya','tz':'Tanzania','vn':'Vietnam','kg':'Kyrgyzstan',
    'us':'USA','il':'Israel','hk':'Hong Kong','pl':'Poland',
    'gb':'England','ng':'Nigeria','eg':'Egypt','in':'India',
    'kh':'Cambodia','co':'Colombia','ee':'Estonia','az':'Azerbaijan',
    'ca':'Canada','ma':'Morocco','gh':'Ghana','ar':'Argentina',
    'uz':'Uzbekistan','cm':'Cameroon','de':'Germany','lt':'Lithuania',
    'hr':'Croatia','se':'Sweden','iq':'Iraq','nl':'Netherlands',
    'lv':'Latvia','at':'Austria','by':'Belarus','th':'Thailand',
    'sa':'Saudi Arabia','mx':'Mexico','tw':'Taiwan','es':'Spain',
    'ir':'Iran','dz':'Algeria','bd':'Bangladesh','tr':'Turkey',
    'cz':'Czech Republic','lk':'Sri Lanka','pe':'Peru','pk':'Pakistan',
    'br':'Brazil','af':'Afghanistan','ug':'Uganda','fr':'France',
    'np':'Nepal','be':'Belgium','bg':'Bulgaria','hu':'Hungary',
    'md':'Moldova','it':'Italy','ae':'UAE','zw':'Zimbabwe',
    'kw':'Kuwait','sy':'Syria','qa':'Qatar','pa':'Panama',
    'cu':'Cuba','do':'Dominican Republic','ec':'Ecuador',
    'bo':'Bolivia','cr':'Costa Rica','gt':'Guatemala',
    'hn':'Honduras','py':'Paraguay','uy':'Uruguay','ve':'Venezuela',
    'et':'Ethiopia','mn':'Mongolia','ao':'Angola','cy':'Cyprus',
    'pg':'Papua New Guinea','mz':'Mozambique','sn':'Senegal',
    'ml':'Mali','gn':'Guinea','td':'Chad','ci':'Ivory Coast',
    'gm':'Gambia','rs':'Serbia','ye':'Yemen','za':'South Africa',
    'ro':'Romania','sk':'Slovakia','si':'Slovenia','ie':'Ireland',
    'pt':'Portugal','gr':'Greece','fi':'Finland','no':'Norway',
    'dk':'Denmark','ch':'Switzerland','nz':'New Zealand',
    'au':'Australia','jp':'Japan','kr':'South Korea','sg':'Singapore',
    'any':'Any Country',
  };
  return names[code] || code.toUpperCase();
}

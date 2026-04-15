/* =====================================================
   data.js — 共用農產品資料
   所有價格以「元/公斤」儲存，成交量以「公斤」儲存
   ===================================================== */

const CROP_DATA = {
  /* ---- 水果 ---- */
  '鳳梨': {
    cat: 'fruit',
    varieties: [
      { code:'B1', name:'鳳梨-開英',   avgA:18.2, avgW:16.5, hiA:22.0, loA:14.5, hiW:20.0, loW:13.0, volA:124000,  volW:38000,  prevA:17.1, prevW:15.8 },
      { code:'B2', name:'鳳梨-金鑽',   avgA:25.4, avgW:22.8, hiA:31.0, loA:19.5, hiW:28.0, loW:17.0, volA:776000,  volW:210000, prevA:24.2, prevW:21.5 },
      { code:'B3', name:'鳳梨-香水',   avgA:32.6, avgW:29.0, hiA:38.0, loA:26.0, hiW:34.0, loW:23.5, volA:89000,   volW:25000,  prevA:31.0, prevW:27.8 },
      { code:'B4', name:'鳳梨-牛奶',   avgA:45.0, avgW:40.5, hiA:52.0, loA:38.0, hiW:47.0, loW:33.0, volA:42000,   volW:12000,  prevA:44.2, prevW:39.0 },
      { code:'B5', name:'鳳梨-冬蜜',   avgA:28.8, avgW:25.5, hiA:34.0, loA:23.0, hiW:30.0, loW:20.0, volA:62000,   volW:18000,  prevA:30.1, prevW:26.8 },
    ],
    season: '鳳梨盛產期為3–6月（金鑽）與9–10月（二期），現為尾季。去年同期均價 28.4 元/公斤（拍賣），今年受出口量縮影響，現價低於去年同期。',
    news: [
      { tag:'tag-price',   label:'報價', title:'金鑽鳳梨批發均價連兩日走升，台南、屏東貨量逐漸收斂', time:'今日 10:15', src:'農傳媒' },
      { tag:'tag-weather', label:'天氣', title:'西南氣流帶來豐沛雨量，鳳梨甜度略降，部分農友延後採收', time:'今日 08:40', src:'農糧署' },
      { tag:'tag-market',  label:'市場', title:'日本市場對台灣鳳梨需求回升，屏東農協加強外銷品控', time:'昨日 16:20', src:'聯合報農業版' },
      { tag:'tag-policy',  label:'政策', title:'農業部補助鳳梨外銷運費，每公斤補貼 2 元至年底', time:'昨日 09:00', src:'農業部公告' },
    ],
  },
  '芒果': {
    cat: 'fruit',
    varieties: [
      { code:'AW1', name:'芒果-愛文',   avgA:68.0, avgW:62.5, hiA:80.0, loA:55.0, hiW:72.0, loW:50.0, volA:210000, volW:65000,  prevA:64.5, prevW:59.0 },
      { code:'AW2', name:'芒果-金煌',   avgA:52.0, avgW:47.0, hiA:62.0, loA:42.0, hiW:56.0, loW:38.0, volA:185000, volW:52000,  prevA:54.0, prevW:48.5 },
      { code:'AW3', name:'芒果-土芒果', avgA:22.0, avgW:18.5, hiA:28.0, loA:16.0, hiW:24.0, loW:14.0, volA:98000,  volW:30000,  prevA:20.5, prevW:17.2 },
      { code:'AW4', name:'芒果-玉文',   avgA:75.0, avgW:69.0, hiA:88.0, loA:62.0, hiW:80.0, loW:55.0, volA:44000,  volW:12000,  prevA:73.0, prevW:66.5 },
      { code:'AW5', name:'芒果-紅蘋果', avgA:42.0, avgW:37.5, hiA:50.0, loA:34.0, hiW:46.0, loW:30.0, volA:61000,  volW:18000,  prevA:45.0, prevW:40.2 },
    ],
    season: '愛文芒果盛產期為5–8月，現為尾季。去年同期因颱風減產均價一度達 92 元/公斤；今年供應較穩，現價偏低，農友宜把握尾季行情。',
    news: [
      { tag:'tag-price',   label:'報價', title:'台南玉井愛文尾季惜售，均價回升至 68 元，業者搶貨',   time:'今日 11:00', src:'農傳媒' },
      { tag:'tag-market',  label:'市場', title:'電商平台芒果禮盒預購熱烈，農場直送訂單創新高',       time:'今日 09:10', src:'數位時代' },
      { tag:'tag-weather', label:'天氣', title:'秋颱威脅解除，芒果主產區採收作業恢復正常',           time:'昨日 17:30', src:'農糧署' },
      { tag:'tag-policy',  label:'政策', title:'農業部補助芒果轉型有機，通過認證最高補助 30 萬',     time:'3天前',      src:'農業部公告' },
    ],
  },
  '荔枝': {
    cat: 'fruit',
    varieties: [
      { code:'LY1', name:'荔枝-玉荷包', avgA:92.0, avgW:82.0, hiA:110.0, loA:74.0, hiW:98.0, loW:65.0, volA:88000,  volW:24000, prevA:88.5, prevW:78.0 },
      { code:'LY2', name:'荔枝-黑葉',   avgA:55.0, avgW:48.0, hiA:65.0,  loA:44.0, hiW:58.0, loW:39.0, volA:140000, volW:40000, prevA:58.0, prevW:50.5 },
      { code:'LY3', name:'荔枝-糯米糍', avgA:78.0, avgW:69.5, hiA:92.0,  loA:62.0, hiW:82.0, loW:55.0, volA:62000,  volW:18000, prevA:80.0, prevW:71.0 },
    ],
    season: '荔枝盛產期為5–7月。玉荷包以品質優良聞名，市場接受度高。現為淡季，流通為少量鮮果或冷凍品。',
    news: [
      { tag:'tag-price',  label:'報價', title:'玉荷包荔枝現貨稀少，均價走堅', time:'今日 09:00', src:'農傳媒' },
      { tag:'tag-market', label:'市場', title:'冷凍荔枝出口東南亞穩定增量',    time:'昨日 14:00', src:'外貿協會' },
    ],
  },
  '香蕉': {
    cat: 'fruit',
    varieties: [
      { code:'BN1', name:'香蕉-北蕉',   avgA:18.5, avgW:16.0, hiA:22.0, loA:14.5, hiW:19.5, loW:12.0, volA:420000, volW:120000, prevA:19.2, prevW:16.8 },
      { code:'BN2', name:'香蕉-粉蕉',   avgA:28.0, avgW:24.5, hiA:34.0, loA:22.0, hiW:30.0, loW:19.0, volA:95000,  volW:28000,  prevA:26.5, prevW:23.0 },
    ],
    season: '香蕉全年均有供應，盛產期為春秋兩季。目前中南部主產區供應穩定，價格平穩。',
    news: [
      { tag:'tag-price',  label:'報價', title:'香蕉均價小幅修正，供應量正常偏多', time:'今日 08:30', src:'農糧署' },
      { tag:'tag-policy', label:'政策', title:'農業部推動香蕉加工品輔導計畫',     time:'2天前',      src:'農業部' },
    ],
  },
  '木瓜': {
    cat: 'fruit',
    varieties: [
      { code:'PP1', name:'木瓜-台農2號', avgA:22.0, avgW:19.5, hiA:27.0, loA:17.0, hiW:24.0, loW:15.0, volA:180000, volW:52000, prevA:23.5, prevW:20.8 },
      { code:'PP2', name:'木瓜-紅妃',    avgA:35.0, avgW:31.0, hiA:42.0, loA:28.0, hiW:38.0, loW:24.0, volA:58000,  volW:16000, prevA:33.0, prevW:29.5 },
    ],
    season: '木瓜全年供應，主產區為屏東、嘉義。秋冬品質佳，甜度高。目前價格略低於去年同期。',
    news: [
      { tag:'tag-price', label:'報價', title:'木瓜均價持穩，屏東產區品質優良', time:'今日 09:45', src:'農傳媒' },
      { tag:'tag-weather', label:'天氣', title:'南部少雨，木瓜甜度表現佳',        time:'昨日 10:00', src:'農糧署' },
    ],
  },
  '葡萄': {
    cat: 'fruit',
    varieties: [
      { code:'GP1', name:'葡萄-巨峰',    avgA:62.0, avgW:55.0, hiA:75.0, loA:50.0, hiW:66.0, loW:44.0, volA:98000,  volW:28000, prevA:58.0, prevW:51.5 },
      { code:'GP2', name:'葡萄-蜜紅',    avgA:88.0, avgW:78.0, hiA:105.0, loA:72.0, hiW:92.0, loW:62.0, volA:42000, volW:12000, prevA:84.0, prevW:74.5 },
      { code:'GP3', name:'葡萄-無籽翠玉',avgA:75.0, avgW:66.0, hiA:88.0,  loA:60.0, hiW:78.0, loW:53.0, volA:55000, volW:15000, prevA:78.0, prevW:69.0 },
    ],
    season: '巨峰葡萄主產於彰化、南投，盛產期為7–9月。現為尾季，品質仍佳，價格較盛產時稍高。',
    news: [
      { tag:'tag-price',  label:'報價', title:'巨峰葡萄尾季價格走堅，高品質串價突破 80 元', time:'今日 10:30', src:'農傳媒' },
      { tag:'tag-market', label:'市場', title:'精品葡萄禮盒搶手，中秋前後需求持續旺盛',    time:'昨日 15:00', src:'聯合報農業版' },
    ],
  },

  /* ---- 蔬菜 ---- */
  '高麗菜': {
    cat: 'vege',
    varieties: [
      { code:'CA1', name:'高麗菜-平地種', avgA:12.4, avgW:10.8, hiA:15.5, loA:9.0,  hiW:13.5, loW:7.5,  volA:820000, volW:240000, prevA:12.18, prevW:10.5 },
      { code:'CA2', name:'高麗菜-山地種', avgA:18.2, avgW:15.5, hiA:22.0, loA:14.0, hiW:18.5, loW:12.0, volA:320000, volW:90000,  prevA:17.5,  prevW:14.8 },
      { code:'CA3', name:'高麗菜-紫高麗', avgA:28.5, avgW:24.0, hiA:35.0, loA:22.0, hiW:30.0, loW:18.0, volA:45000,  volW:12000,  prevA:27.0,  prevW:22.5 },
    ],
    season: '高麗菜秋冬盛產，台中、彰化為主產區。今年種植面積略增，供應充足，去年同期均價 14.2 元/公斤，今年偏低。',
    news: [
      { tag:'tag-weather', label:'天氣', title:'東北季風增強，山區高麗菜葉片受損，本週供應量減少約 8%', time:'今日 10:15', src:'農傳媒' },
      { tag:'tag-price',   label:'報價', title:'高麗菜批發均價連兩日走升，台北市場上價達 15.2 元',      time:'今日 08:40', src:'農業部' },
      { tag:'tag-market',  label:'市場', title:'超市通路加碼採購，高麗菜大箱裝需求明顯回升',            time:'昨日 16:20', src:'聯合報農業版' },
      { tag:'tag-policy',  label:'政策', title:'農業部公告本季蔬菜產銷履歷補貼方案，申請截止 11/30',    time:'昨日 09:00', src:'農業部公告' },
    ],
  },
  '番茄': {
    cat: 'vege',
    varieties: [
      { code:'TM1', name:'番茄-牛番茄',    avgA:38.5, avgW:34.0, hiA:46.0,  loA:30.0, hiW:40.0, loW:26.0, volA:280000, volW:82000, prevA:40.2, prevW:35.5 },
      { code:'TM2', name:'番茄-聖女小番茄',avgA:72.0, avgW:65.0, hiA:85.0,  loA:58.0, hiW:75.0, loW:52.0, volA:150000, volW:42000, prevA:68.5, prevW:61.8 },
      { code:'TM3', name:'番茄-黑柿番茄',  avgA:42.0, avgW:37.5, hiA:50.0,  loA:33.0, hiW:44.0, loW:29.0, volA:95000,  volW:28000, prevA:44.0, prevW:39.2 },
      { code:'TM4', name:'番茄-橙蜜小番茄',avgA:88.0, avgW:79.5, hiA:102.0, loA:72.0, hiW:92.0, loW:65.0, volA:62000,  volW:18000, prevA:85.0, prevW:76.0 },
    ],
    season: '番茄秋冬盛產，嘉義、台南為主力。今年產量大增，均價受壓。小番茄品種利潤較佳，建議轉型。',
    news: [
      { tag:'tag-price',   label:'報價', title:'牛番茄中價跌破 35 元，嘉義產區農友憂心後市',  time:'今日 09:30', src:'農傳媒' },
      { tag:'tag-weather', label:'天氣', title:'南部豔陽助長著色，品質優良但產量同步大增',    time:'今日 07:55', src:'農糧署' },
      { tag:'tag-market',  label:'市場', title:'加工醬廠需求穩定，下單量較去年同期增 15%',    time:'昨日 14:00', src:'食品工業研究所' },
      { tag:'tag-policy',  label:'政策', title:'農業部啟動番茄輸日促銷計畫',                  time:'2天前',      src:'農業部' },
    ],
  },
  '地瓜': {
    cat: 'vege',
    varieties: [
      { code:'SW1', name:'地瓜-台農57號', avgA:18.0, avgW:15.5, hiA:22.0, loA:14.0, hiW:19.0, loW:12.0, volA:380000, volW:110000, prevA:16.8, prevW:14.5 },
      { code:'SW2', name:'地瓜-紅心地瓜', avgA:24.0, avgW:21.0, hiA:29.0, loA:19.0, hiW:25.0, loW:16.5, volA:120000, volW:34000,  prevA:22.5, prevW:19.8 },
    ],
    season: '地瓜秋冬盛產，台南善化、嘉義為主產區。今年天候佳品質好，均價略高於去年同期，需求穩定。',
    news: [
      { tag:'tag-price',  label:'報價', title:'地瓜均價連5日走高，超市搶貨帶動批發量增', time:'今日 09:45', src:'聯合報農業版' },
      { tag:'tag-weather', label:'天氣', title:'嘉南平原乾燥涼爽，地瓜甜度提升',          time:'今日 08:00', src:'農糧署' },
    ],
  },
  '菠菜': {
    cat: 'vege',
    varieties: [
      { code:'SP1', name:'菠菜-平地菠菜', avgA:22.0, avgW:19.0, hiA:27.0, loA:17.0, hiW:23.5, loW:15.0, volA:195000, volW:58000, prevA:21.5, prevW:18.5 },
    ],
    season: '菠菜秋冬盛產，雲林西螺為主要產區。現階段供應充足，價格平穩，農友宜關注需求端變化。',
    news: [
      { tag:'tag-weather', label:'天氣', title:'雲林產區連日豪雨影響菠菜採收，供應略減', time:'今日 08:20', src:'農傳媒' },
    ],
  },
  '花椰菜': {
    cat: 'vege',
    varieties: [
      { code:'BF1', name:'花椰菜-白花椰', avgA:18.7, avgW:16.5, hiA:23.0, loA:14.5, hiW:20.0, loW:12.5, volA:280000, volW:82000,  prevA:19.14, prevW:16.9 },
      { code:'BF2', name:'花椰菜-青花菜', avgA:32.0, avgW:28.0, hiA:38.0, loA:25.0, hiW:34.0, loW:22.0, volA:92000,  volW:26000,  prevA:30.5,  prevW:26.8 },
    ],
    season: '花椰菜秋冬盛產，彰化二林、雲林為主產區。白花椰供應量大，價格較低。青花菜相對高值，適合契作或直銷通路。',
    news: [
      { tag:'tag-price',  label:'報價', title:'白花椰均價下滑，供應量持續偏多', time:'今日 10:00', src:'農糧署' },
      { tag:'tag-market', label:'市場', title:'青花菜外銷日本訂單增加，農友宜考慮申請輸出登記', time:'昨日 13:30', src:'農傳媒' },
    ],
  },
};

/* 拍賣市場清單 */
const AUCTION_MARKETS = [
  { name:'台北二', region:'北' }, { name:'台北一', region:'北' },
  { name:'板橋區', region:'北' }, { name:'三重市', region:'北' },
  { name:'宜蘭市', region:'北' }, { name:'台中市', region:'中' },
  { name:'豐原區', region:'中' }, { name:'嘉義市', region:'南' },
  { name:'高雄市', region:'南' }, { name:'鳳山市', region:'南' },
  { name:'台東市', region:'東' },
];

/* 行口市場清單 */
const WHOLESALE_MARKETS = [
  { name:'台北行口', region:'北' }, { name:'三重行口', region:'北' },
  { name:'桃園行口', region:'北' }, { name:'台中行口', region:'中' },
  { name:'彰化行口', region:'中' }, { name:'嘉義行口', region:'南' },
  { name:'高雄行口', region:'南' },
];

const REGION_COLOR = { 北:'#185FA5', 中:'#854F0B', 南:'#3B6D11', 東:'#534AB7' };
const REGION_BG    = { 北:'#E6F1FB', 中:'#FAEEDA', 南:'#EAF3DE', 東:'#EEEDFE' };

/* 取得代表均價（拍賣，第一個品種） */
function getCropAvgA(key) {
  const v = CROP_DATA[key].varieties[0];
  return v ? v.avgA : 0;
}

function getCropPrevA(key) {
  const v = CROP_DATA[key].varieties[0];
  return v ? v.prevA : 0;
}

function getCropTotalVolA(key) {
  return CROP_DATA[key].varieties.reduce((s, v) => s + v.volA, 0);
}

window.CROP_DATA         = CROP_DATA;
window.AUCTION_MARKETS   = AUCTION_MARKETS;
window.WHOLESALE_MARKETS = WHOLESALE_MARKETS;
window.REGION_COLOR      = REGION_COLOR;
window.REGION_BG         = REGION_BG;
window.getCropAvgA       = getCropAvgA;
window.getCropPrevA      = getCropPrevA;
window.getCropTotalVolA  = getCropTotalVolA;

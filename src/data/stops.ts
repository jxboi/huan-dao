import type { Stop } from './types';

/**
 * Towns on or near the loop. Coordinates are approximate town centres
 * (research/07). `overnight` scores come from research/05.
 */
export const STOPS: Stop[] = [
  // ── North ─────────────────────────────────────────────────────────────
  {
    id: 'taipei', name: 'Taipei', zh: '台北', lat: 25.0478, lng: 121.517, region: 'north',
    overnight: 3, lodgingFactor: 1.25,
    blurb: 'Capital and the usual start/finish. Rent your scooter here, stock up on gear, eat at the night markets.',
    food: ['Beef noodle soup', 'Xiaolongbao', 'Pepper buns (胡椒餅)', 'Braised pork rice (滷肉飯)'],
  },
  {
    id: 'tamsui', name: 'Tamsui', zh: '淡水', lat: 25.169, lng: 121.44, region: 'north',
    overnight: 2, lodgingFactor: 1.1,
    blurb: 'River-mouth town famous for sunsets, Fort San Domingo and the old street.',
    food: ['A-gei (阿給)', 'Iron eggs (鐵蛋)', 'Fish-ball soup'],
  },
  {
    id: 'jinshan', name: 'Jinshan', zh: '金山', lat: 25.222, lng: 121.637, region: 'north',
    overnight: 1, lodgingFactor: 1.0,
    blurb: 'North-coast hot-spring town near Yehliu Geopark.',
    food: ['Jinshan duck (金山鴨肉)', 'Sweet potatoes'],
  },
  {
    id: 'keelung', name: 'Keelung', zh: '基隆', lat: 25.1283, lng: 121.7419, region: 'north',
    overnight: 2, lodgingFactor: 1.0,
    blurb: 'Rainy harbour city with one of Taiwan\'s best night markets (Miaokou).',
    food: ['Pot-side scrapings (鼎邊趖)', 'Tempura (天婦羅)', 'Seafood'],
  },
  {
    id: 'jiufen', name: 'Jiufen', zh: '九份', lat: 25.109, lng: 121.844, region: 'northeast',
    overnight: 2, lodgingFactor: 1.2,
    blurb: 'Lantern-lit hillside gold-mining town with teahouses and sea views.',
    food: ['Taro balls (芋圓)', 'Fish balls', 'Oolong tea'],
  },
  {
    id: 'pingxi', name: 'Pingxi (Shifen)', zh: '平溪', lat: 25.044, lng: 121.776, region: 'northeast',
    overnight: 1, lodgingFactor: 1.0,
    blurb: 'Old coal-mining valley on a branch railway: sky lanterns at Shifen and Pingxi, Shifen Waterfall.',
    food: ['Chicken wing rice rolls (雞翅包飯)', 'Sausage with sticky rice'],
  },
  {
    id: 'pinglin', name: 'Pinglin', zh: '坪林', lat: 24.936, lng: 121.711, region: 'northeast',
    overnight: 1, lodgingFactor: 0.9,
    blurb: 'Tea town on the twisty Beiyi Highway (Tai 9).',
    food: ['Baozhong tea (包種茶)', 'Tea-flavoured snacks'],
  },
  {
    id: 'fulong', name: 'Fulong', zh: '福隆', lat: 25.019, lng: 121.944, region: 'northeast',
    overnight: 2, lodgingFactor: 1.0,
    blurb: 'Golden-sand beach town; famous railway bento and the old Caoling tunnel bike path.',
    food: ['Fulong bento (福隆便當)'],
  },
  {
    id: 'toucheng', name: 'Toucheng', zh: '頭城', lat: 24.859, lng: 121.823, region: 'northeast',
    overnight: 2, lodgingFactor: 0.95,
    blurb: 'Surf town facing Guishan (Turtle) Island. Wai\'ao beach is right here.',
    food: ['Surfer cafés', 'Seafood'],
  },
  {
    id: 'yilan', name: 'Yilan', zh: '宜蘭', lat: 24.757, lng: 121.753, region: 'northeast',
    overnight: 3, lodgingFactor: 0.95,
    blurb: 'Green plains, hot springs at Jiaoxi, and relaxed small-city vibes.',
    food: ['Scallion pancakes (蔥油餅)', 'Smoked duck (鴨賞)', 'Ox-tongue biscuits (牛舌餅)'],
  },
  {
    id: 'luodong', name: 'Luodong', zh: '羅東', lat: 24.677, lng: 121.769, region: 'northeast',
    overnight: 3, lodgingFactor: 0.95,
    blurb: 'Busy market town with a great night market; handy last stop before the Suhua.',
    food: ['Luodong night market', 'Sweet potato balls', 'Cherry duck'],
  },
  {
    id: 'suao', name: "Su'ao", zh: '蘇澳', lat: 24.595, lng: 121.851, region: 'northeast',
    overnight: 2, lodgingFactor: 0.9,
    blurb: 'Cold-spring town and fishing port (Nanfang\'ao). Fill up here before the Suhua.',
    food: ['Nanfang\'ao seafood', 'Cold-spring soda'],
  },
  // ── East ──────────────────────────────────────────────────────────────
  {
    id: 'nanao', name: "Nan'ao", zh: '南澳', lat: 24.464, lng: 121.8, region: 'east',
    overnight: 1, lodgingFactor: 0.9,
    blurb: 'Quiet Atayal township halfway along the Suhua. Good rest stop.',
    food: ['Indigenous dishes'],
  },
  {
    id: 'heping', name: 'Heping', zh: '和平', lat: 24.298, lng: 121.753, region: 'east',
    overnight: 1, lodgingFactor: 0.9,
    blurb: 'Cement-works village where the Suhua reaches Hualien county.',
    food: ['Convenience stores only'],
  },
  {
    id: 'xincheng', name: 'Xincheng (Taroko)', zh: '新城', lat: 24.128, lng: 121.64, region: 'east',
    overnight: 1, lodgingFactor: 1.0,
    blurb: 'Gateway to Taroko Gorge and Qingshui Cliffs views. Check Taroko status before detouring.',
    food: ['Xincheng old street snacks'],
  },
  {
    id: 'hualien', name: 'Hualien', zh: '花蓮', lat: 23.992, lng: 121.601, region: 'east',
    overnight: 3, lodgingFactor: 1.0,
    blurb: 'East-coast hub between mountains and sea. Great base for a rest day.',
    food: ['Bianshi wontons (扁食)', 'Mochi (麻糬)', 'Bamboo-tube rice (竹筒飯)', 'Dongdamen night market'],
  },
  {
    id: 'fengbin', name: 'Fengbin', zh: '豐濱', lat: 23.597, lng: 121.521, region: 'east',
    overnight: 1, lodgingFactor: 0.9,
    blurb: 'Amis coastal village on Hwy 11 — near Shitiping and the Xiuguluan river mouth.',
    food: ['Amis cuisine', 'Seafood'],
  },
  {
    id: 'guangfu', name: 'Guangfu', zh: '光復', lat: 23.669, lng: 121.423, region: 'east',
    overnight: 1, lodgingFactor: 0.85,
    blurb: 'Rift Valley town with the Mataian wetland and a big old sugar factory (ice pops!).',
    food: ['Sugar factory ice pops', 'Amis wild vegetables'],
  },
  {
    id: 'ruisui', name: 'Ruisui', zh: '瑞穗', lat: 23.497, lng: 121.375, region: 'east',
    overnight: 2, lodgingFactor: 0.95,
    blurb: 'Hot-spring town on the Tropic of Cancer; start of the Xiuguluan river gorge road.',
    food: ['Ruisui fresh milk', 'Hot-spring eggs'],
  },
  {
    id: 'jingpu', name: 'Jingpu', zh: '靜浦', lat: 23.464, lng: 121.494, region: 'east',
    overnight: 0, lodgingFactor: 0.9,
    blurb: 'River-mouth village at the Tropic of Cancer marker on Hwy 11.',
    food: [],
  },
  {
    id: 'yuli', name: 'Yuli', zh: '玉里', lat: 23.334, lng: 121.315, region: 'east',
    overnight: 2, lodgingFactor: 0.85,
    blurb: 'Rift Valley town famous for its noodles; gateway to Walami trail and Antong hot springs.',
    food: ['Yuli noodles (玉里麵)', 'Stinky tofu'],
  },
  {
    id: 'fuli', name: 'Fuli', zh: '富里', lat: 23.18, lng: 121.248, region: 'east',
    overnight: 1, lodgingFactor: 0.85,
    blurb: 'Southernmost Hualien township: organic rice, and the day-lily fields of Liushidan Mountain (Aug–Sep).',
    food: ['Fuli rice', 'Day-lily dishes (金針花)'],
  },
  {
    id: 'chishang', name: 'Chishang', zh: '池上', lat: 23.125, lng: 121.219, region: 'east',
    overnight: 2, lodgingFactor: 0.95,
    blurb: 'Endless rice fields and Mr Brown Avenue. Rent a bicycle for golden hour.',
    food: ['Chishang lunch box (池上便當)', 'Rice ice cream'],
  },
  {
    id: 'guanshan', name: 'Guanshan', zh: '關山', lat: 23.047, lng: 121.163, region: 'east',
    overnight: 1, lodgingFactor: 0.85,
    blurb: 'Small valley town with a 12 km riverside bike loop.',
    food: ['Guanshan bento'],
  },
  {
    id: 'chenggong', name: 'Chenggong', zh: '成功', lat: 23.099, lng: 121.378, region: 'east',
    overnight: 2, lodgingFactor: 0.9,
    blurb: 'Big fishing harbour — go to the afternoon fish auction and eat sashimi.',
    food: ['Fresh sashimi', 'Swordfish', 'Flying fish'],
  },
  {
    id: 'donghe', name: 'Donghe', zh: '東河', lat: 22.97, lng: 121.301, region: 'east',
    overnight: 1, lodgingFactor: 0.9,
    blurb: 'Where Tai 23 meets the coast: the old Donghe Bridge over the Mawuku river mouth and the Jinzun surf break.',
    food: ['Donghe steamed buns (東河包子)'],
  },
  {
    id: 'dulan', name: 'Dulan', zh: '都蘭', lat: 22.88, lng: 121.23, region: 'east',
    overnight: 2, lodgingFactor: 1.0,
    blurb: 'Laid-back surf & art village with an old sugar factory turned creative space.',
    food: ['Dulan cafés', 'Amis-fusion dinners'],
  },
  {
    id: 'taitung', name: 'Taitung', zh: '台東', lat: 22.756, lng: 121.15, region: 'east',
    overnight: 3, lodgingFactor: 0.95,
    blurb: 'Relaxed southeast city; ferries to Green & Orchid Island leave from nearby Fugang.',
    food: ['Sugar apple (釋迦)', 'Fried rice noodles', 'Millet wine'],
  },
  {
    id: 'taimali', name: 'Taimali', zh: '太麻里', lat: 22.616, lng: 121.007, region: 'south',
    overnight: 2, lodgingFactor: 0.9,
    blurb: 'Sunrise coast — first place in Taiwan to see the new-year sun.',
    food: ['Sugar apple', 'Day-lily dishes (金針花)'],
  },
  {
    id: 'dawu', name: 'Dawu', zh: '大武', lat: 22.34, lng: 120.894, region: 'south',
    overnight: 1, lodgingFactor: 0.85,
    blurb: 'Last proper town before the South Link climbs the mountains. Fuel up!',
    food: ['Local fish soup'],
  },
  {
    id: 'shouka', name: 'Shouka Pass', zh: '壽卡', lat: 22.238, lng: 120.848, region: 'south',
    overnight: 0, lodgingFactor: 1.0,
    blurb: '460 m pass over the Central Range, famous cyclist checkpoint. Cafe & stamp.',
    food: [],
  },
  {
    id: 'xuhai', name: 'Xuhai', zh: '旭海', lat: 22.199, lng: 120.882, region: 'south',
    overnight: 1, lodgingFactor: 0.9,
    blurb: 'Remote east-Pingtung village with a hot spring, start of the Alangyi coast.',
    food: [],
  },
  {
    id: 'manzhou', name: 'Manzhou', zh: '滿州', lat: 22.021, lng: 120.839, region: 'south',
    overnight: 2, lodgingFactor: 1.1,
    blurb: 'Quiet side of the Hengchun peninsula — Jialeshui coast and grey-faced buzzard migrations.',
    food: ['Port tea (港口茶)'],
  },
  {
    id: 'kenting', name: 'Kenting', zh: '墾丁', lat: 21.946, lng: 120.798, region: 'south',
    overnight: 3, lodgingFactor: 1.3,
    blurb: 'Tropical southern tip: beaches, Eluanbi lighthouse, busy night street. Pricier at weekends.',
    food: ['Seafood', 'Hengchun onions', 'Kenting night market'],
  },
  // ── Southwest ─────────────────────────────────────────────────────────
  {
    id: 'fangliao', name: 'Fangliao', zh: '枋寮', lat: 22.366, lng: 120.594, region: 'southwest',
    overnight: 1, lodgingFactor: 0.85,
    blurb: 'Where the west-coast plains end and Tai 1 hugs the sea.',
    food: ['Mango', 'Seafood'],
  },
  {
    id: 'donggang', name: 'Donggang', zh: '東港', lat: 22.466, lng: 120.449, region: 'southwest',
    overnight: 2, lodgingFactor: 0.95,
    blurb: 'Tuna capital and ferry port for Xiaoliuqiu (sea turtles!).',
    food: ['Bluefin tuna (May–Jun)', 'Sakura shrimp', 'Oil-fish roe'],
  },
  {
    id: 'kaohsiung', name: 'Kaohsiung', zh: '高雄', lat: 22.627, lng: 120.301, region: 'southwest',
    overnight: 3, lodgingFactor: 1.0,
    blurb: 'Taiwan\'s harbour city: Pier-2 art district, Lotus Pond, Cijin island.',
    food: ['Papaya milk', 'Seafood', 'Ruifeng night market'],
  },
  {
    id: 'tainan', name: 'Tainan', zh: '台南', lat: 22.997, lng: 120.203, region: 'southwest',
    overnight: 3, lodgingFactor: 0.95,
    blurb: 'The old capital and food capital — temples, alleys and the best breakfasts in Taiwan.',
    food: ['Beef soup (牛肉湯)', 'Danzai noodles (擔仔麵)', 'Milkfish congee', 'Coffin bread'],
  },
  {
    id: 'beimen', name: 'Beimen', zh: '北門', lat: 23.267, lng: 120.126, region: 'southwest',
    overnight: 1, lodgingFactor: 0.85,
    blurb: 'Salt-field coast with the Crystal Wedding Church and Qigu salt mountain nearby.',
    food: ['Milkfish', 'Salt ice cream'],
  },
  // ── Central ───────────────────────────────────────────────────────────
  {
    id: 'chiayi', name: 'Chiayi', zh: '嘉義', lat: 23.479, lng: 120.441, region: 'central',
    overnight: 3, lodgingFactor: 0.9,
    blurb: 'Friendly city at the foot of Alishan. Famous for turkey rice.',
    food: ['Turkey rice (雞肉飯)', 'Fish-head casserole (砂鍋魚頭)'],
  },
  {
    id: 'alishan', name: 'Alishan', zh: '阿里山', lat: 23.51, lng: 120.802, region: 'central',
    overnight: 2, lodgingFactor: 1.3,
    blurb: '2,200 m mountain resort: sunrise over a sea of clouds, giant cypress trees. Cold at night.',
    food: ['High-mountain oolong', 'Wasabi dishes'],
  },
  {
    id: 'sunmoonlake', name: 'Sun Moon Lake', zh: '日月潭', lat: 23.866, lng: 120.915, region: 'central',
    overnight: 2, lodgingFactor: 1.3,
    blurb: 'Taiwan\'s most famous lake — lakeside cycle path, boats, Thao culture.',
    food: ['Assam black tea', 'Thao cuisine', 'Tea eggs'],
  },
  {
    id: 'lukang', name: 'Lukang', zh: '鹿港', lat: 24.057, lng: 120.435, region: 'central',
    overnight: 2, lodgingFactor: 0.9,
    blurb: 'Well-preserved Qing-era port town: temples, alleys, craftsmen.',
    food: ['Bawan (肉圓)', 'Ox-tongue cakes', 'Oyster omelette'],
  },
  {
    id: 'changhua', name: 'Changhua', zh: '彰化', lat: 24.082, lng: 120.539, region: 'central',
    overnight: 1, lodgingFactor: 0.85,
    blurb: 'Home of the original bawan and the Great Buddha.',
    food: ['Bawan (肉圓)', 'Braised pork rice'],
  },
  {
    id: 'taichung', name: 'Taichung', zh: '台中', lat: 24.137, lng: 120.685, region: 'central',
    overnight: 3, lodgingFactor: 1.0,
    blurb: 'Big, sunny, easy-going city. Birthplace of bubble tea; Fengjia night market.',
    food: ['Bubble tea', 'Sun cakes (太陽餅)', 'Fengjia night market'],
  },
  // ── Northwest ─────────────────────────────────────────────────────────
  {
    id: 'sanyi', name: 'Sanyi', zh: '三義', lat: 24.413, lng: 120.765, region: 'northwest',
    overnight: 2, lodgingFactor: 0.95,
    blurb: 'Hakka woodcarving town in the hills; Longteng broken bridge nearby.',
    food: ['Hakka stir-fry', 'Hakka mochi'],
  },
  {
    id: 'hsinchu', name: 'Hsinchu', zh: '新竹', lat: 24.802, lng: 120.972, region: 'northwest',
    overnight: 2, lodgingFactor: 1.0,
    blurb: 'Windy tech city with a lively City God Temple food area.',
    food: ['Rice noodles (米粉)', 'Pork meatballs (貢丸)'],
  },
];

export const STOP_BY_ID: Record<string, Stop> = Object.fromEntries(STOPS.map((s) => [s.id, s]));

export function getStop(id: string): Stop {
  const s = STOP_BY_ID[id];
  if (!s) throw new Error(`Unknown stop: ${id}`);
  return s;
}

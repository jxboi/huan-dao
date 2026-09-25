/**
 * Static guide content shown on the Guide screen (research/02, 03, 08, 09).
 * Plain data so it can be translated or edited without touching components.
 */

export interface GuideSection {
  id: string;
  icon: string;
  title: string;
  items: { title: string; body: string; url?: string }[];
}

export const GUIDE: GuideSection[] = [
  {
    id: 'licence',
    icon: '🪪',
    title: 'Licence & renting',
    items: [
      { title: 'You need an IDP with motorcycle category', body: 'Bring an International Driving Permit that covers motorcycles, your home licence and passport. Reputable shops won\'t rent without it — and riding unlicensed voids insurance. IDPs are usually valid 30 days from entry.' },
      { title: 'What rental costs', body: '125cc: ~NT$400–900/day (peak up to 1,500). 150cc: ~NT$700–1,200. Ask for a multi-day huandao discount. Deposit NT$3,000–10,000 cash or card hold — avoid leaving your passport.' },
      { title: 'Before you ride off', body: 'Photograph scratches, test brakes, lights & horn, check tyres. Save the shop\'s phone number and ask what to do if you break down far away.' },
      { title: 'One-way & skipping sections', body: 'One-way rental is possible but pricey. Taiwan Railway no longer carries scooters as luggage (since 2019); private scooter shipping (機車托運) costs NT$600–2,000.' },
    ],
  },
  {
    id: 'rules',
    icon: '🚦',
    title: 'Road rules that catch visitors',
    items: [
      { title: 'No freeways', body: 'Scooters are banned from National Freeways (國道) and some expressways (e.g. parts of Tai 61, Tai 64). Follow the signs; the app only uses scooter-legal highways.' },
      { title: 'Two-stage left turn', body: 'At signed intersections, go straight to the white waiting box at the far-right corner, turn to face left, and wait for the green light.' },
      { title: 'No right turn on red', body: 'Fine NT$600–1,800. Red-light running: NT$1,800–5,400.' },
      { title: 'Pedestrians first', body: 'Failing to yield at crosswalks can cost up to NT$6,000 and is heavily enforced.' },
      { title: 'Helmets & alcohol', body: 'Helmets are compulsory for rider & passenger (NT$500 each). Drink-riding: zero tolerance, fines from NT$30,000.' },
      { title: 'Speed cameras everywhere', body: 'Typical limits: towns 40–50 km/h, provincial highways 50–70 km/h. Tunnels: headlights on.' },
    ],
  },
  {
    id: 'roads',
    icon: '⛰️',
    title: 'Road status (check before you go)',
    items: [
      { title: 'Suhua Highway (Yilan ↔ Hualien)', body: 'Scooters ≤250cc must use Tai 9D and designated tunnels (Renshui; Zhongren on trial since 2025). The Daqingshui–Heren part of Tai 9D will not be repaired after the 2024 quake — traffic uses Tai 9. Most demanding section: trucks, tunnels, rockfall. Ride in daylight and good weather.', url: 'https://www.thb.gov.tw/' },
      { title: 'Taroko Gorge', body: 'Partly reopened. Shakadang, Swallow Grotto, Tunnel of Nine Turns, Baiyang and Zhuilu are still closed (2026). Tai 8 opens at fixed release times only.', url: 'https://www.taroko.gov.tw/en/TAROKO_HighwayCondition.aspx?n=7879' },
      { title: 'Typhoons & closures', body: 'After heavy rain, the Suhua, Hwy 11 and mountain roads can close for days. Keep a buffer day on the east coast.', url: 'https://www.cwa.gov.tw/eng/' },
      { title: 'Live road info', body: 'Directorate General of Highways traffic info & the 1968 service show closures and incidents.', url: 'https://1968.freeway.gov.tw/' },
    ],
  },
  {
    id: 'safety',
    icon: '🛟',
    title: 'Safety & emergencies',
    items: [
      { title: 'Emergency numbers', body: '110 police (all traffic accidents) · 119 ambulance/fire · 112 from any mobile · 1990 foreigner helpline (24h, English) · 0800-011-765 tourist info hotline.' },
      { title: 'If you crash', body: '1) Get safe, hazards on. 2) Call 110 (a police record is needed for insurance) and 119 if anyone is hurt. 3) Photograph everything before moving. 4) Call your rental shop.' },
      { title: 'Everyday dangers', body: 'Gravel trucks on Suhua, stray dogs on rural roads, sand on corners, slippery road paint and manhole covers in rain, fog on mountain passes.' },
      { title: 'Arrive before dark', body: 'Rural roads are unlit and petrol stations may close ~20:00. Plan to arrive by sunset (≈17:10 in Dec, ≈18:50 in Jun).' },
      { title: 'Heat & fatigue', body: 'Ride early in summer, stop every 60–90 min, drink lots — there\'s a 7-Eleven every few km in most places.' },
    ],
  },
  {
    id: 'culture',
    icon: '🧧',
    title: 'Huandao culture & tips',
    items: [
      { title: 'Stamp collecting', body: 'Stations, temples, visitor centres and even 7-Elevens have souvenir ink stamps (紀念章). Buy a notebook and collect them around the island.' },
      { title: 'Wear your "環島中" proudly', body: 'Riders fly a "環島" flag or sticker. Locals often cheer you on — and some shops give huandao riders small discounts.' },
      { title: 'Fuel stops', body: 'Attendants fill up for you: say "jiā mǎn, jiǔ-wǔ" (加滿 95 — fill it up with 95). Cash, card or EasyCard.' },
      { title: 'Convenience stores are your base', body: '7-Eleven/FamilyMart: rain gear, SIM top-ups, ATMs, toilets, water refills, parking fee payment and hot meals.' },
    ],
  },
];

export interface MonthWeather {
  month: number;
  rating: 'best' | 'good' | 'fair' | 'poor';
  note: string;
}

export const WEATHER: MonthWeather[] = [
  { month: 1, rating: 'good', note: 'Cool & drizzly in the north (NE monsoon), dry in the south. Pack warm layers.' },
  { month: 2, rating: 'good', note: 'Dry south, damp north. Avoid Chinese New Year week — prices & traffic spike.' },
  { month: 3, rating: 'best', note: 'Mild and mostly dry — one of the best months to ride.' },
  { month: 4, rating: 'best', note: 'Warm, pleasant. Tomb Sweeping long weekend is busy.' },
  { month: 5, rating: 'fair', note: 'Plum rain season starts mid-May — expect heavy showers.' },
  { month: 6, rating: 'fair', note: 'Plum rain then heat. Early typhoons possible.' },
  { month: 7, rating: 'poor', note: 'Hot (33 °C+) and peak typhoon season. Kenting is packed.' },
  { month: 8, rating: 'poor', note: 'Peak typhoon month. Keep plans flexible, ride early mornings.' },
  { month: 9, rating: 'fair', note: 'Still hot; late typhoons possible, especially on the east coast.' },
  { month: 10, rating: 'best', note: 'Clear skies and cooler air — superb, except the odd late typhoon.' },
  { month: 11, rating: 'best', note: 'Great riding; drizzle begins in the north, windy in Kenting.' },
  { month: 12, rating: 'good', note: 'Cool and dry in the south, drizzly north. Short days — start early.' },
];

export const CHECKLIST: { group: string; items: string[] }[] = [
  { group: 'Documents', items: ['Passport', 'International Driving Permit (motorcycle)', 'Home driving licence', 'Rental contract & shop phone no.', 'Credit card + cash (NT$)', 'EasyCard / iPASS'] },
  { group: 'Riding gear', items: ['Two-piece raincoat', 'Shoe covers', 'Gloves', 'Buff / face mask', 'Sunglasses', 'Sunscreen', 'Phone mount', 'Power bank & cables', 'Bungee cords / cargo net', 'Dry bags'] },
  { group: 'Clothing', items: ['Quick-dry shirts', 'Light fleece / warm layer', 'Sandals', 'Swimwear (hot springs & beaches)'] },
  { group: 'Health', items: ['First-aid kit', 'Painkillers', 'Mosquito repellent', 'Personal medication'] },
  { group: 'Tech & extras', items: ['SIM / eSIM with data', 'Offline maps downloaded', 'Translation app', 'Stamp notebook', '環島 flag or sticker'] },
];

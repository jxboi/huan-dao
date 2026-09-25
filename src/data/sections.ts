import type { RoadWarning, Section } from './types';

/**
 * The loop, split into sections between hubs, listed CLOCKWISE starting in
 * Taipei. Each section offers one or more variants the user can toggle.
 * Distances are approximate scooter-legal road distances (research/01).
 */

const SUHUA_WARNING: RoadWarning = {
  level: 'danger',
  text:
    'Suhua Highway: scooters ≤250cc must use Tai 9D + designated tunnels (Renshui; Zhongren on trial). ' +
    'Tai 9D between Daqingshui and Heren is abandoned after the 2024 quake — traffic uses Tai 9 there. ' +
    'Heavy trucks, long tunnels, rockfall. Ride in daylight & dry weather; check status the morning you go.',
  url: 'https://www.thb.gov.tw/',
  checked: '2026-09',
};

const FUEL_EAST: RoadWarning = {
  level: 'caution',
  text: 'Long gaps between petrol stations; rural stations may close by 20:00. Fill up at every town.',
};

const MOUNTAIN_WARNING: RoadWarning = {
  level: 'caution',
  text: 'Steep mountain road with fog and cold at altitude. 125cc works but is slow two-up. Avoid after dark.',
};

export const SECTIONS: Section[] = [
  {
    id: 'taipei-yilan',
    from: 'taipei',
    to: 'yilan',
    title: 'Taipei → Yilan',
    defaultVariant: 'ne-coast',
    variants: [
      {
        id: 'ne-coast',
        name: 'Northeast Coast (Tai 2)',
        summary: 'Keelung, Jiufen, Bitou Cape, Fulong beach and the surf town of Toucheng. Easy & scenic.',
        difficulty: 1,
        tags: ['coast', 'classic'],
        legs: [
          { to: 'keelung', km: 30, speed: 30, road: 'Tai 5 / Tai 2', scenic: 1 },
          { to: 'jiufen', km: 15, speed: 30, road: 'Tai 2 / 102', scenic: 3 },
          { to: 'fulong', km: 30, speed: 40, road: 'Tai 2', scenic: 3 },
          { to: 'toucheng', km: 30, speed: 45, road: 'Tai 2', scenic: 3 },
          { to: 'yilan', km: 15, speed: 35, road: 'Tai 9', scenic: 1 },
        ],
      },
      {
        id: 'beiyi',
        name: 'Beiyi Highway (Tai 9)',
        summary: 'Shortest way: twisty mountain road through Pinglin tea country. Fast, fun, busy with bikers.',
        difficulty: 2,
        tags: ['mountain', 'short'],
        legs: [
          {
            to: 'pinglin', km: 35, speed: 32, road: 'Tai 9', scenic: 2,
            warnings: [{ level: 'caution', text: 'Hundreds of hairpins and many speeding bikes, esp. weekends. Heavy police enforcement.' }],
          },
          { to: 'yilan', km: 40, speed: 32, road: 'Tai 9', scenic: 2 },
        ],
      },
      {
        id: 'north-coast',
        name: 'Full North Coast (Tamsui → Tai 2)',
        summary: 'The long way round: Tamsui sunset, Jinshan, Yehliu rocks, Keelung, then the NE coast.',
        difficulty: 1,
        tags: ['coast', 'long'],
        legs: [
          { to: 'tamsui', km: 25, speed: 30, road: 'Tai 2B', scenic: 2 },
          { to: 'jinshan', km: 40, speed: 45, road: 'Tai 2', scenic: 3 },
          { to: 'keelung', km: 25, speed: 40, road: 'Tai 2', scenic: 2 },
          { to: 'jiufen', km: 15, speed: 30, road: 'Tai 2 / 102', scenic: 3 },
          { to: 'fulong', km: 30, speed: 40, road: 'Tai 2', scenic: 3 },
          { to: 'toucheng', km: 30, speed: 45, road: 'Tai 2', scenic: 3 },
          { to: 'yilan', km: 15, speed: 35, road: 'Tai 9', scenic: 1 },
        ],
      },
    ],
  },
  {
    id: 'yilan-hualien',
    from: 'yilan',
    to: 'hualien',
    title: 'Yilan → Hualien (Suhua)',
    defaultVariant: 'suhua',
    variants: [
      {
        id: 'suhua',
        name: 'Suhua Highway (Tai 9 / 9D)',
        summary: 'Cliffs dropping into the Pacific. The most spectacular and most demanding ride of the loop.',
        difficulty: 3,
        tags: ['coast', 'tunnels'],
        legs: [
          { to: 'luodong', km: 12, speed: 35, road: 'Tai 9', scenic: 1 },
          { to: 'suao', km: 18, speed: 40, road: 'Tai 9', scenic: 1 },
          { to: 'nanao', km: 28, speed: 35, road: 'Tai 9D / Tai 9', scenic: 3, warnings: [SUHUA_WARNING] },
          { to: 'heping', km: 30, speed: 35, road: 'Tai 9D / Tai 9', scenic: 3, warnings: [SUHUA_WARNING] },
          { to: 'xincheng', km: 30, speed: 35, road: 'Tai 9', scenic: 3, warnings: [SUHUA_WARNING] },
          { to: 'hualien', km: 20, speed: 35, road: 'Tai 9', scenic: 1 },
        ],
      },
    ],
  },
  {
    id: 'hualien-taitung',
    from: 'hualien',
    to: 'taitung',
    title: 'Hualien → Taitung',
    defaultVariant: 'coast-11',
    variants: [
      {
        id: 'coast-11',
        name: 'Pacific Coast (Hwy 11)',
        summary: 'Ocean all day: Baqi viewpoint, Shitiping, Baxian Caves, Sanxiantai, Dulan.',
        difficulty: 1,
        tags: ['coast', 'classic'],
        legs: [
          { to: 'fengbin', km: 60, speed: 45, road: 'Tai 11', scenic: 3, warnings: [FUEL_EAST] },
          { to: 'chenggong', km: 50, speed: 45, road: 'Tai 11', scenic: 3 },
          { to: 'dulan', km: 38, speed: 45, road: 'Tai 11', scenic: 3 },
          { to: 'taitung', km: 22, speed: 40, road: 'Tai 11', scenic: 2 },
        ],
      },
      {
        id: 'rift-9',
        name: 'East Rift Valley (Hwy 9)',
        summary: 'Rice paddies between two mountain ranges: Ruisui hot springs, Yuli, Chishang, Guanshan.',
        difficulty: 1,
        tags: ['valley', 'hot-springs'],
        legs: [
          { to: 'guangfu', km: 40, speed: 45, road: 'Tai 9', scenic: 2 },
          { to: 'ruisui', km: 25, speed: 45, road: 'Tai 9', scenic: 2 },
          { to: 'yuli', km: 22, speed: 45, road: 'Tai 9 / 193', scenic: 2 },
          { to: 'chishang', km: 28, speed: 45, road: 'Tai 9', scenic: 3 },
          { to: 'guanshan', km: 10, speed: 40, road: 'Tai 9', scenic: 2 },
          { to: 'taitung', km: 45, speed: 45, road: 'Tai 9', scenic: 2 },
        ],
      },
      {
        id: 'valley-coast',
        name: 'Valley then Coast (Rui-Gang Rd 64)',
        summary: 'Rift Valley to Ruisui, the Xiuguluan river gorge road to the sea, then Hwy 11 south.',
        difficulty: 2,
        tags: ['valley', 'coast', 'best-of-both'],
        legs: [
          { to: 'guangfu', km: 40, speed: 45, road: 'Tai 9', scenic: 2 },
          { to: 'ruisui', km: 25, speed: 45, road: 'Tai 9', scenic: 2 },
          { to: 'jingpu', km: 25, speed: 35, road: 'County 64 (Rui-Gang)', scenic: 3 },
          { to: 'chenggong', km: 42, speed: 45, road: 'Tai 11', scenic: 3, warnings: [FUEL_EAST] },
          { to: 'dulan', km: 38, speed: 45, road: 'Tai 11', scenic: 3 },
          { to: 'taitung', km: 22, speed: 40, road: 'Tai 11', scenic: 2 },
        ],
      },
    ],
  },
  {
    id: 'taitung-kenting',
    from: 'taitung',
    to: 'kenting',
    title: 'Taitung → Kenting',
    defaultVariant: 'south-link',
    variants: [
      {
        id: 'south-link',
        name: 'South Link (Tai 9) + Tai 26',
        summary: 'Sunrise coast to Dawu, over Shouka pass to the Taiwan Strait, down to Kenting.',
        difficulty: 2,
        tags: ['mountain-pass', 'classic'],
        legs: [
          { to: 'taimali', km: 30, speed: 50, road: 'Tai 9', scenic: 2 },
          { to: 'dawu', km: 35, speed: 50, road: 'Tai 9', scenic: 3, warnings: [FUEL_EAST] },
          { to: 'shouka', km: 22, speed: 40, road: 'Tai 9 (South Link)', scenic: 2 },
          { to: 'kenting', km: 55, speed: 40, road: 'Tai 9 / Tai 26', scenic: 2 },
        ],
      },
      {
        id: 'east-pingtung',
        name: 'Wild East Pingtung Coast',
        summary: 'Shouka, then down to remote Xuhai and the Jiupeng dunes, around Manzhou to Kenting.',
        difficulty: 3,
        tags: ['remote', 'coast'],
        legs: [
          { to: 'taimali', km: 30, speed: 50, road: 'Tai 9', scenic: 2 },
          { to: 'dawu', km: 35, speed: 50, road: 'Tai 9', scenic: 3, warnings: [FUEL_EAST] },
          { to: 'shouka', km: 22, speed: 40, road: 'Tai 9 (South Link)', scenic: 2 },
          {
            to: 'xuhai', km: 30, speed: 30, road: 'County 199 / 199A', scenic: 3,
            warnings: [{ level: 'caution', text: 'Remote, few services, no fuel. Verify road numbers & conditions locally.' }],
          },
          { to: 'manzhou', km: 32, speed: 35, road: 'Tai 26', scenic: 3 },
          { to: 'kenting', km: 18, speed: 35, road: 'Tai 26 / 200', scenic: 2 },
        ],
      },
    ],
  },
  {
    id: 'kenting-kaohsiung',
    from: 'kenting',
    to: 'kaohsiung',
    title: 'Kenting → Kaohsiung',
    defaultVariant: 'tai1',
    variants: [
      {
        id: 'tai1',
        name: 'Tai 26 / Tai 1 via Donggang',
        summary: 'Up the west coast of the peninsula, through Fangliao and the tuna port of Donggang.',
        difficulty: 1,
        tags: ['coast'],
        legs: [
          { to: 'fangliao', km: 55, speed: 45, road: 'Tai 26 / Tai 1', scenic: 2 },
          { to: 'donggang', km: 22, speed: 40, road: 'Tai 17', scenic: 1 },
          { to: 'kaohsiung', km: 30, speed: 30, road: 'Tai 17', scenic: 1 },
        ],
      },
    ],
  },
  {
    id: 'kaohsiung-tainan',
    from: 'kaohsiung',
    to: 'tainan',
    title: 'Kaohsiung → Tainan',
    defaultVariant: 'tai1',
    variants: [
      {
        id: 'tai1',
        name: 'Tai 1 / Tai 17',
        summary: 'Short urban hop between the two southern cities.',
        difficulty: 1,
        tags: ['urban'],
        legs: [{ to: 'tainan', km: 50, speed: 30, road: 'Tai 1 / Tai 17', scenic: 1 }],
      },
    ],
  },
  {
    id: 'tainan-chiayi',
    from: 'tainan',
    to: 'chiayi',
    title: 'Tainan → Chiayi',
    defaultVariant: 'tai1',
    variants: [
      {
        id: 'tai1',
        name: 'Tai 1 direct',
        summary: 'Straight up the plains. Quick and flat.',
        difficulty: 1,
        tags: ['short'],
        legs: [{ to: 'chiayi', km: 65, speed: 35, road: 'Tai 1', scenic: 1 }],
      },
      {
        id: 'salt-coast',
        name: 'Salt Coast via Beimen',
        summary: 'Qigu salt mountain, lagoons, Beimen Crystal Church and fish farms on Tai 17.',
        difficulty: 1,
        tags: ['coast', 'culture'],
        legs: [
          { to: 'beimen', km: 45, speed: 40, road: 'Tai 17 / Tai 61 frontage', scenic: 2 },
          { to: 'chiayi', km: 50, speed: 40, road: 'County 168 / Tai 1', scenic: 1 },
        ],
      },
    ],
  },
  {
    id: 'chiayi-taichung',
    from: 'chiayi',
    to: 'taichung',
    title: 'Chiayi → Taichung',
    defaultVariant: 'plains',
    variants: [
      {
        id: 'plains',
        name: 'Plains via Lukang',
        summary: 'Tai 1/Tai 17 across farmland to the old port of Lukang, then Changhua and Taichung.',
        difficulty: 1,
        tags: ['culture'],
        legs: [
          { to: 'lukang', km: 75, speed: 40, road: 'Tai 1 / Tai 17', scenic: 1 },
          { to: 'changhua', km: 15, speed: 30, road: 'Tai 19', scenic: 1 },
          { to: 'taichung', km: 20, speed: 30, road: 'Tai 1', scenic: 1 },
        ],
      },
      {
        id: 'sun-moon-lake',
        name: 'Sun Moon Lake detour',
        summary: 'Inland on Tai 3 through tea and bamboo country up to Sun Moon Lake, then down to Taichung.',
        difficulty: 2,
        tags: ['mountain', 'lake'],
        legs: [
          { to: 'sunmoonlake', km: 100, speed: 35, road: 'Tai 3 / Tai 21', scenic: 3, warnings: [MOUNTAIN_WARNING] },
          { to: 'taichung', km: 70, speed: 40, road: 'Tai 21 / Tai 14 / Tai 3', scenic: 2 },
        ],
      },
      {
        id: 'alishan',
        name: 'Alishan + Sun Moon Lake (advanced)',
        summary: 'Climb to 2,200 m Alishan, cross Tataka (2,600 m) on Tai 18/21 to Sun Moon Lake. Plan 2+ days.',
        difficulty: 3,
        tags: ['mountain', 'advanced'],
        legs: [
          { to: 'alishan', km: 75, speed: 28, road: 'Tai 18', scenic: 3, warnings: [MOUNTAIN_WARNING] },
          {
            to: 'sunmoonlake', km: 100, speed: 28, road: 'Tai 18 / Tai 21', scenic: 3,
            warnings: [MOUNTAIN_WARNING, { level: 'caution', text: 'No fuel between Alishan and Shuili — fill up in Alishan.' }],
          },
          { to: 'taichung', km: 70, speed: 40, road: 'Tai 21 / Tai 14 / Tai 3', scenic: 2 },
        ],
      },
    ],
  },
  {
    id: 'taichung-hsinchu',
    from: 'taichung',
    to: 'hsinchu',
    title: 'Taichung → Hsinchu',
    defaultVariant: 'tai1',
    variants: [
      {
        id: 'tai1',
        name: 'Tai 1 (west plains)',
        summary: 'Direct route north. Watch for signs — parts of Tai 61 expressway ban scooters.',
        difficulty: 1,
        tags: ['short'],
        legs: [{ to: 'hsinchu', km: 100, speed: 38, road: 'Tai 1', scenic: 1 }],
      },
      {
        id: 'hakka-hills',
        name: 'Hakka Hills via Sanyi (Tai 3 / Tai 13)',
        summary: 'Rolling Hakka hill country: woodcarving town Sanyi, Dahu strawberries, Beipu tea.',
        difficulty: 2,
        tags: ['hills', 'culture'],
        legs: [
          { to: 'sanyi', km: 45, speed: 38, road: 'Tai 13', scenic: 2 },
          { to: 'hsinchu', km: 70, speed: 35, road: 'Tai 3 / County 122', scenic: 2 },
        ],
      },
    ],
  },
  {
    id: 'hsinchu-taipei',
    from: 'hsinchu',
    to: 'taipei',
    title: 'Hsinchu → Taipei',
    defaultVariant: 'tai1',
    variants: [
      {
        id: 'tai1',
        name: 'Tai 1 via Taoyuan',
        summary: 'Urban and full of traffic lights, but direct.',
        difficulty: 1,
        tags: ['urban'],
        legs: [{ to: 'taipei', km: 80, speed: 30, road: 'Tai 1', scenic: 1 }],
      },
      {
        id: 'west-coast',
        name: 'West Coast via Tamsui',
        summary: 'Coastal frontage roads past Bali, sunset at Tamsui, then into Taipei.',
        difficulty: 1,
        tags: ['coast', 'sunset'],
        legs: [
          { to: 'tamsui', km: 85, speed: 38, road: 'Tai 15 / Tai 61 frontage', scenic: 2 },
          { to: 'taipei', km: 25, speed: 30, road: 'Tai 2B', scenic: 1 },
        ],
      },
    ],
  },
];

export const SECTION_BY_ID: Record<string, Section> = Object.fromEntries(SECTIONS.map((s) => [s.id, s]));

/** Hubs in clockwise order starting at Taipei (== each section's `from`). */
export const HUBS: string[] = SECTIONS.map((s) => s.from);

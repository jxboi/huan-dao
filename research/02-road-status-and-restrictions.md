# 02 · Road Status & Restrictions (⚠ time-sensitive — last checked Sep 2026)

## Freeways are off-limits
Scooters and motorcycles (including 550cc heavy bikes on most routes) are **banned
from National Freeways (國道, e.g. No.1, No.3, No.5 Hsuehshan Tunnel)**. Some
Provincial Expressways (快速公路, e.g. Tai 61, Tai 64, Tai 88) are also banned or
partially banned — follow blue/red signage. The Hsuehshan Tunnel (Taipei↔Yilan)
is freeway: scooters must go via Tai 2 (coast) or Tai 9 (Beiyi).

**City expressways (Taipei).** White-plate scooters may not ride Taipei's expressways and elevated roads:
堤頂大道, 環東大道, 水源快速道路, 環河南北快速道路, 信義快速道路, 洲美快速道路, 建國高架道路, 市民高架道路,
基隆高架道路, 新生高架 (Taipei Dept. of Transportation via LTN, 2026: https://news.ltn.com.tw/news/life/breakingnews/5487846;
checked Sep 2026). Routers often send scooters onto them because OSM doesn't always tag the ban.

**淡江大橋 (Danjiang Bridge, Tai 61, Tamsui ↔ Bali) is open to scooters** on a dedicated 2.5 m scooter lane,
40 km/h (Highway Bureau, thb.gov.tw news 295386). The Bali end is entered "從台61線或挖子尾匝道" (from Tai 61 or
the 挖子尾 ramp; 遠見 gvm.com.tw/article/130048). How far scooters may ride Tai 61 there isn't stated, so our map lines
use the 挖子尾 ramp and treat the rest of Tai 61's expressway mainline as off-limits (checked Sep 2026).

**Enforced in code:** `src/data/scooterRules.ts` turns these rules into checks on every map line
(`src/data/scooterRules.test.ts`); `npm run snap-legs` won't save a line that breaks one.

Plate colours:
* **Green** — ≤50cc (and small e-scooters). Slow; not recommended for Huan Dao.
* **White** — 50–250cc ("普通重型"). Most rentals (125cc/150cc). Must do two-stage left turns and stay in the scooter/right lane.
* **Yellow** — 250–550cc, **Red** — >550cc ("大型重機"). Heavy-bike licence required; may use some expressways and normal car lanes; allowed on Suhua Improved Highway.

## Suhua Highway (Su'ao ↔ Hualien)
* Suhua Improved Highway (蘇花改, Tai 9) opened 2020. Heavy (yellow/red) bikes allowed since Sept 2022.
* White-plate scooters (50–250cc) historically had to use the **old Suhua, Tai 9D (台9丁)** plus specific tunnels. **Renshui Tunnel** is open to scooters, bicycles and pedestrians.
* **Zhongren Tunnel** (中仁隧道) trial for white plates from 30 Apr 2025 (6-month trial, dedicated right lane, 50 km/h limit, keep 50 m gap, headlights on). **⚠ VERIFY** whether the trial was made permanent.
* The Improved Highway (Tai 9) has three new sections — **Su'ao–Dong'ao** (蘇澳, 東澳 tunnels), **Nan'ao–Heping**
  (觀音, 谷風, 武塔 tunnels) and **Hezhong–Daqingshui** (中仁, 仁水 tunnels). **Daqingshui–Chongde (Qingshui Cliff:
  大清水/錦文/匯德/崇德 tunnels) is still the old road** (zh.wikipedia 蘇花公路改善計畫; checked Sep 2026).
* The **April 2024 Hualien earthquake** (M7.4) and later typhoons destroyed the Tai 9D section between **Daqingshui and Heren (9D 64K–69K)**. In **January 2026 the government announced it will not be repaired**; all traffic is routed through Tai 9 in that section.
* Practical advice for the app:
  * Ride the Suhua in daylight, not in heavy rain, and not on holiday weekends (truck + tourist traffic).
  * Check the Highway Bureau / 1968 app (交通部高速公路局 "1968") and "Taiwan Road Traffic Information" before leaving.
  * Section closes after heavy rain/earthquakes — build a buffer day into east-coast plans.
  * Petrol: fill up in Su'ao or Hualien; few stations between (Nan'ao, Heping have some).

## Taroko Gorge & Central Cross-Island Highway (Tai 8)
* Heavy damage in April 2024. Partial reopening through 2025–2026 (Dali-Datong, Chongde areas reopened summer 2025).
* **Still closed (2026):** Shakadang Trail, Swallow Grotto, Tunnel of Nine Turns, Baiyang Trail, Zhuilu Old Road, Eternal Spring Shrine trail.
* Tai 8 open only at **fixed release windows** (5 per day; 17:30–18:00 exit-only). Self-drive vehicles only; no buses to Tianxiang.
* Oct 2025 landslide dam flooded part of Tai 8 (drained).
* App guidance: treat Taroko as an optional half-day detour; always check https://www.taroko.gov.tw/en/TAROKO_HighwayCondition.aspx?n=7879 the morning of.
* **Sep 2026 schedule, Tai 8 east (Guanyuan–Taroko):** five release windows a day between 06:30 and 18:00
  (06:30–08:00, 10:00–10:05, 12:00–13:00, 15:00–15:05, 17:00–18:00); nightly closure 18:30–06:30; daytime two-way
  traffic over the 25–28 Sep Mid-Autumn holiday (Tienhsiang Youth Activity Center, reposting the Highway Bureau notice:
  tienhsiang.cyh.org.tw/?p=8151; checked Sep 2026). Earlier in 2026 it was 10 ten-minute windows 08:30–17:30 (Mar–Apr
  notice, thb.gov.tw s=293860) — the schedule changes monthly. The notices set no separate rule for scooters.
  Used by the Lishan mountain route (`TAI8_EAST` warning in sections.ts).
* **Tai 8 west (Guguan–Deji, the "中橫便道") is still closed to the public**: only residents, officials and a
  reservation bus, at three set times a day. A permanent rebuild is planned for ~2037 (storm.mg 2026-01-02; thb2museum;
  checked Sep 2026). So Lishan can't be reached from Taichung — only via Tai 7A (Yilan), Tai 8 east (Hualien) or Tai 14A
  (Puli).

## Tai 7A — Central Cross-Island Highway, Yilan branch (Qilan → Lishan)
* Open to all traffic incl. scooters; Siyuan Pass 1,948 m. Roadworks with stop-go control are common (e.g. 0K–45K and
  35.9K, weekdays 08:00–17:00, 1 Jul–31 Aug 2026; thbu4.thb.gov.tw). Road condition line: 獨立山工務段 03-9962683.
* Petrol: Nanshan (~45 km before Lishan) and Lishan only (LTN 2019, see research/01).

## South Link Highway (Tai 9, Taitung ↔ Pingtung)
* Upgraded, wide, lots of tunnels on the new alignment; Shouka pass at 460 m.
* Crosswinds on coastal stretch near Dawu; afternoon fog on the pass.
* Petrol: Taimali, Dawu, Daren, Shouka (limited), Fenggang.

## East coast Hwy 11 & Hwy 9
* Generally excellent; occasional rockfall closures after typhoons (esp. north of Shitiping).
* Long stretches between towns on Hwy 11 — plan petrol at Fengbin, Chenggong, Donghe.
* Tai 23 (Fuli → Donghe, 45.4 km): winding climb to ~637 m over the Coastal Range; no petrol between Fuli and Donghe;
  landslide closures possible after heavy rain. **⚠ VERIFY** before riding.

## Mountain roads (Alishan Tai 18, Hehuanshan Tai 14A, Southern Cross-Island Tai 20)
* Tai 14A (Wuling 3,275 m) — highest road in East Asia; cold, thin air, 125cc struggles.
  * Open to scooters, but **all motorcycles and scooters (incl. heavy bikes) are stopped from entering the controlled
    high section when there is snow or ice** — mostly Dec–Mar (Highway Bureau snow-season notices, thb.gov.tw, and
    udn 2025; checked Sep 2026). Azalea season (11 Apr–14 Jun 2026): weekend/holiday 06:00–11:00 high-occupancy control
    aimed at cars.
* **Tai 20 Southern Cross-Island, Meishankou–Xiangyang (臨105線 0K–44K, includes Yakou):** open **Fri–Mon only**,
  entry 07:00–14:00, everyone out by 17:00; **closed Tue–Thu**. Open to scooters and vehicles up to 9 seats; no hikers or
  bicycles (Yushan National Park road status page, updated 2026-09-23: ysnp.gov.tw/Highway/C001300). In effect since
  1 Dec 2025 (before that it was closed Tue & Thu only). Closed in typhoons, quakes and heavy rain.
  * Petrol: none on the mountain road — Haiduan/Guanshan in the east, Meigu/Baolai in the west, 100+ km apart
    (aroundtaiwan.net, 2023).
* Not part of the default loop: Tai 14A and Tai 20 are side trips in the app (research/01).

## Official status sources to link from the app
* Taiwan road traffic (Directorate General of Highways): https://www.thb.gov.tw/
* 1968 road info (freeway + provincial highways): https://1968.freeway.gov.tw/
* Taroko NP roads & trails: https://www.taroko.gov.tw/en/TAROKO_HighwayCondition.aspx?n=7879
* Central Weather Administration (typhoons): https://www.cwa.gov.tw/eng/

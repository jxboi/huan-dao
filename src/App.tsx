import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { IconBook, IconCalendar, IconCompass, IconMap, IconPin, IconWallet } from './components/icons';
import { currencyFor } from './lib/budget';
import { fmtKm, fmtMoney } from './lib/format';
import { BudgetScreen } from './screens/BudgetScreen';
import { DaysScreen } from './screens/DaysScreen';
import { ExploreScreen } from './screens/ExploreScreen';
import { GuideScreen } from './screens/GuideScreen';
import { PlanScreen } from './screens/PlanScreen';
import { RouteScreen } from './screens/RouteScreen';
import { useStore } from './state/store';

export type Tab = 'plan' | 'route' | 'days' | 'explore' | 'budget' | 'guide';

const TABS: { id: Tab; icon: ReactNode; label: string }[] = [
  { id: 'plan', icon: <IconCompass />, label: 'Trip' },
  { id: 'route', icon: <IconMap />, label: 'Route' },
  { id: 'days', icon: <IconCalendar />, label: 'Days' },
  { id: 'explore', icon: <IconPin />, label: 'Explore' },
  { id: 'budget', icon: <IconWallet />, label: 'Budget' },
];

const TITLES: Record<Tab, string> = {
  plan: 'Huan Dao',
  route: 'Route',
  days: 'Day by day',
  explore: 'Explore',
  budget: 'Budget',
  guide: 'Rider guide',
};

/** Hash-based tab routing so tabs are linkable (#/days, #/days/3) without a router dependency. */
function useTab(): [Tab, (t: Tab, sub?: string) => void] {
  const read = (): Tab => {
    const t = window.location.hash.replace('#/', '').split('/')[0] as Tab;
    return t in TITLES ? t : 'plan';
  };
  const [tab, setTab] = useState<Tab>(read);
  useEffect(() => {
    const on = () => setTab(read());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  const go = useCallback((t: Tab, sub?: string) => {
    window.location.hash = sub ? `/${t}/${sub}` : `/${t}`;
    window.scrollTo({ top: 0 });
  }, []);
  return [tab, go];
}

export default function App() {
  const [tab, go] = useTab();
  const { plan, budget, settings } = useStore();

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand" onClick={() => go('plan')} role="link" tabIndex={0}>
          <span className="logo" aria-hidden>環島</span>
          <div>
            <div className="brand-title">{TITLES[tab]}</div>
            {tab !== 'plan' && (
              <div className="brand-sub">
                {settings.days} days · {fmtKm(plan.totalKm)} · ≈{fmtMoney(budget.perPerson, currencyFor(settings.currency))}/person
              </div>
            )}
          </div>
        </div>
        <button className={`icon-btn ${tab === 'guide' ? 'on' : ''}`} onClick={() => go('guide')} aria-label="Rider guide">
          <IconBook />
          <span>Guide</span>
        </button>
      </header>

      <main>
        {tab === 'plan' && <PlanScreen go={go} />}
        {tab === 'route' && <RouteScreen />}
        {tab === 'days' && <DaysScreen />}
        {tab === 'explore' && <ExploreScreen />}
        {tab === 'budget' && <BudgetScreen />}
        {tab === 'guide' && <GuideScreen />}
      </main>

      <nav className="tabbar" aria-label="Main">
        {TABS.map((t) => (
          <button key={t.id} className={tab === t.id ? 'on' : ''} onClick={() => go(t.id)} aria-current={tab === t.id ? 'page' : undefined}>
            {t.icon}
            {t.label}
          </button>
        ))}
      </nav>
    </div>
  );
}

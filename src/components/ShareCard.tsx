import { useState } from 'react';
import { planToIcs } from '../lib/ics';
import { shareUrl } from '../lib/share';
import { useStore } from '../state/store';
import { Card } from './ui';

/** Share link, calendar download and print — everything that gets a plan off this device. */
export function ShareCard() {
  const { settings, plan } = useStore();
  const [status, setStatus] = useState('');

  const share = async () => {
    const url = shareUrl(window.location.href, settings);
    try {
      if (navigator.share) {
        await navigator.share({ title: 'My Huan Dao plan', text: `${settings.days}-day loop around Taiwan`, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setStatus('Link copied — anyone who opens it gets this plan.');
    } catch (e) {
      if ((e as Error).name === 'AbortError') return; // user closed the share sheet
      window.prompt('Copy this link:', url);
    }
  };

  const downloadIcs = () => {
    const ics = planToIcs(plan, settings.startDate, new Date());
    if (!ics) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }));
    a.download = `huan-dao-${settings.startDate}.ics`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  return (
    <Card title="📤 Share & export">
      <div className="hero-actions">
        <button className="btn primary" onClick={share}>🔗 Share link</button>
        <button className="btn ghost" onClick={downloadIcs} disabled={!settings.startDate}>📅 Calendar (.ics)</button>
        <button className="btn ghost" onClick={() => window.print()}>🖨️ Print / PDF</button>
      </div>
      <p className="muted small" role="status">
        {status || (settings.startDate ? 'The link carries your route, days and pins — not your packing list.' : 'Set a start date to export a calendar.')}
      </p>
    </Card>
  );
}

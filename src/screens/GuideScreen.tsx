import { Card } from '../components/ui';
import { CHECKLIST, GUIDE, WEATHER } from '../data/guide';
import { useStore } from '../state/store';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const RATING = { best: '🌤️ Best', good: '🙂 Good', fair: '🌦️ Fair', poor: '🌀 Typhoons' } as const;

export function GuideScreen() {
  const { settings, dispatch } = useStore();
  const all = CHECKLIST.flatMap((g) => g.items);
  const done = all.filter((i) => settings.checklist[i]).length;

  return (
    <div className="screen">
      <Card title="🆘 Emergency" className="emergency">
        <div className="sos">
          <a href="tel:110" className="sos-btn">110<small>Police / accident</small></a>
          <a href="tel:119" className="sos-btn">119<small>Ambulance / fire</small></a>
          <a href="tel:1990" className="sos-btn">1990<small>Foreigner help (EN)</small></a>
        </div>
      </Card>

      {GUIDE.map((g) => (
        <Card key={g.id} title={`${g.icon} ${g.title}`}>
          {g.items.map((it) => (
            <details key={it.title} className="acc">
              <summary>{it.title}</summary>
              <p>{it.body}</p>
              {it.url && (
                <a className="link small" href={it.url} target="_blank" rel="noreferrer">Official info ↗</a>
              )}
            </details>
          ))}
        </Card>
      ))}

      <Card title="🌦️ When to go">
        <div className="months">
          {WEATHER.map((w) => (
            <div key={w.month} className={`month ${w.rating}`} title={w.note}>
              <strong>{MONTHS[w.month - 1]}</strong>
              <span>{RATING[w.rating]}</span>
            </div>
          ))}
        </div>
        <p className="muted small">Best: Mar–Apr and Oct–Nov. Typhoon season May–Oct (peak Jul–Sep). NE monsoon brings drizzle to the north Oct–Mar.</p>
      </Card>

      <Card title={`🎒 Packing checklist (${done}/${all.length})`}>
        {CHECKLIST.map((g) => (
          <fieldset key={g.group} className="check-group">
            <legend>{g.group}</legend>
            {g.items.map((i) => (
              <label key={i} className="check">
                <input type="checkbox" checked={!!settings.checklist[i]} onChange={() => dispatch({ type: 'toggleCheck', item: i })} />
                <span>{i}</span>
              </label>
            ))}
          </fieldset>
        ))}
      </Card>
    </div>
  );
}

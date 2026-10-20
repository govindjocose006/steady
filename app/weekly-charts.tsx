'use client';

import {useState} from 'react';
import {BarChart3, BookOpen, Sparkles} from 'lucide-react';
import {prettyDate} from '@/lib/tasks';
import type {weeklySummary} from '@/lib/weekly-review';

type Summary = ReturnType<typeof weeklySummary>;
const weekday = (date: string) => new Intl.DateTimeFormat('en-IN', {weekday: 'short', timeZone: 'Asia/Kolkata'}).format(new Date(date + 'T06:00:00Z'));

export default function WeeklyCharts({summary}: {summary: Summary}) {
  const [selected, setSelected] = useState(Math.max(0, summary.elapsedDays - 1));
  const activity = summary.activity, daily = summary.lectures.daily;
  const maxActivity = Math.max(1, ...activity.map(d => d.phd + d.net + d.research));
  const maxLectures = Math.max(1, ...daily.map(d => Math.max(d.count, d.target, d.stretch)));
  const day = activity[selected], lectureDay = daily[selected];
  const total = activity.reduce((n, d) => n + d.phd + d.net + d.research, 0);
  return <section className="weekly-visuals" aria-label="Weekly progress charts">
    <div className="weekly-highlight"><Sparkles size={20} aria-hidden="true"/><p>{total ? <><strong>{total} completed activities</strong> this week · {summary.applications.count} application submissions · {summary.lectures.count} lectures · {summary.research.count} research tasks</> : <><strong>{summary.future ? 'Your next chapter.' : 'A fresh week of progress.'}</strong> Your saved completions will appear here.</>}</p></div>
    <div className="weekly-chart-grid">
      <article className="weekly-chart-card">
        <header><BarChart3 size={20} aria-hidden="true"/><div><h3>Daily activity</h3><p>Completed activities, grouped by goal</p></div></header>
        <div className="chart-legend"><span><i className="activity-phd"/>PhD</span><span><i className="activity-net"/>Study</span><span><i className="activity-research"/>Research</span></div>
        <div className="weekly-bars" role="group" aria-label="Choose a day to inspect completed activities">
          {activity.map((d, i) => { const count = d.phd + d.net + d.research; return <button key={d.date} className={'chart-day' + (d.future ? ' future-day' : '')} aria-pressed={selected === i} onClick={() => setSelected(i)} aria-label={`${prettyDate(d.date)}: ${d.future ? 'upcoming' : `${d.phd} PhD, ${d.net} study, ${d.research} research activities completed`}`}>
            <span className="chart-count" aria-hidden="true">{d.future ? '—' : count}</span>
            <span className="chart-well" aria-hidden="true"><span className="chart-stack">{(['phd', 'net', 'research'] as const).map(goal => <i className={'activity-' + goal} key={goal} style={{height: `${d[goal] / maxActivity * 100}%`}}/>)}</span></span>
            <span>{weekday(d.date)}</span>
          </button>; })}
        </div>
        <div className="chart-day-detail" aria-live="polite"><strong>{prettyDate(day.date)}</strong><p>{day.future ? 'Upcoming day — no results yet.' : `${day.phd} PhD · ${day.net} study · ${day.research} research completions`}</p></div>
        <p className="chart-footnote">Counts, not hours. PhD includes preparation and submissions. Linked tasks count once. Zero means no completions recorded.</p>
        <details className="chart-data"><summary>View activity data</summary><div className="review-table-scroll"><table><caption className="sr-only">Completed activities by day and goal</caption><thead><tr><th scope="col">Day</th><th scope="col">PhD</th><th scope="col">Study</th><th scope="col">Research</th></tr></thead><tbody>{activity.map(d => <tr key={d.date}><th scope="row">{prettyDate(d.date)}</th><td>{d.future ? 'Upcoming' : d.phd}</td><td>{d.future ? 'Upcoming' : d.net}</td><td>{d.future ? 'Upcoming' : d.research}</td></tr>)}</tbody></table></div></details>
      </article>
      <article className="weekly-chart-card">
        <header><BookOpen size={20} aria-hidden="true"/><div><h3>Lectures & daily target</h3><p>{summary.lectures.count} completed · {summary.lectures.metDays} target days</p></div></header>
        <div className="chart-legend"><span><i className="activity-net"/>Completed</span><span><i className="target-legend"/>Daily target</span></div>
        <div className="weekly-bars" role="group" aria-label="Choose a day to inspect lecture progress">
          {daily.map((d, i) => <button key={d.date} className={'chart-day' + (d.future ? ' future-day' : '')} aria-pressed={selected === i} onClick={() => setSelected(i)} aria-label={`${prettyDate(d.date)}: ${d.future ? 'upcoming' : `${d.count} lectures completed, target ${d.target}${d.historicalKnown ? '' : ', using current target'}`}`}>
            <span className="chart-count" aria-hidden="true">{d.future ? '—' : d.count}</span>
            <span className="chart-well" aria-hidden="true"><span className="chart-stack"><i className="activity-net" style={{height: `${d.count / maxLectures * 100}%`}}/></span>{!d.future && <i className="chart-target" style={{bottom: `${d.target / maxLectures * 100}%`}}/>}</span>
            <span>{weekday(d.date)}</span>
          </button>)}
        </div>
        <div className="chart-day-detail" aria-live="polite"><strong>{prettyDate(lectureDay.date)}</strong><p>{lectureDay.future ? 'Upcoming day — no results yet.' : `${lectureDay.count} completed · Target ${lectureDay.target} · Stretch ${lectureDay.stretch}${!lectureDay.historicalKnown ? ' (current settings)' : ''}`}</p></div>
        <p className="chart-footnote">Select a day for details. {summary.lectures.unknownTargets ? 'Some historical targets are unavailable; those days use your current settings.' : 'Targets follow the settings recorded for each day.'} Exact values are also in Daily lecture progress below.</p>
      </article>
    </div>
  </section>;
}

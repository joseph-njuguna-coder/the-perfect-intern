import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useApi } from '../../../lib/useApi.js';
import { Heading } from '../../../components/ui.jsx';

const BRAND = '#0A56B5';
const GOLD = '#F7941D';

function ChartCard({ title, data, x, y, kind = 'line', color = BRAND, money = false, label }) {
  const total = data.reduce((a, r) => a + Number(r[y] || 0), 0);
  const fmt = (v) => (money ? `KSh ${Number(v).toLocaleString('en-KE')}` : Number(v).toLocaleString('en-KE'));
  const Chart = kind === 'bar' ? BarChart : LineChart;
  return (
    <figure className="rounded-xl border border-line bg-white p-4">
      <figcaption className="flex items-baseline justify-between"><span className="font-bold">{title}</span><span className="text-sm text-slate2">{label || 'Total'}: <strong className="text-ink">{fmt(total)}</strong></span></figcaption>
      <div className="mt-3 h-52" role="img" aria-label={`${title} chart. ${label || 'Total'} ${fmt(total)}.`}>
        <ResponsiveContainer width="100%" height="100%">
          <Chart data={data} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E1E5EB" vertical={false} />
            <XAxis dataKey={x} tickFormatter={(v) => String(v).slice(-5)} tick={{ fontSize: 11 }} interval="preserveStartEnd" minTickGap={24} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v) => [fmt(v), title]} labelFormatter={(l) => String(l)} />
            {kind === 'bar' ? <Bar dataKey={y} fill={color} radius={[3, 3, 0, 0]} /> : <Line type="monotone" dataKey={y} stroke={color} strokeWidth={2} dot={false} />}
          </Chart>
        </ResponsiveContainer>
      </div>
    </figure>
  );
}

export function RevenueCharts() {
  const { data, loading, error } = useApi('/admin/revenue');
  if (loading) return <p className="text-slate2">Loading revenue…</p>;
  if (error) return <p role="alert" className="text-red-600">{error.message}</p>;
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <ChartCard title="Daily revenue (last 30 days)" data={data.daily} x="day" y="revenue" kind="bar" money />
      <ChartCard title="Monthly revenue (last 12 months)" data={data.monthly} x="month" y="revenue" kind="bar" money color={GOLD} />
    </div>
  );
}

export default function AdminAnalytics() {
  const [days, setDays] = useState(30);
  const { data, loading, error } = useApi('/admin/analytics', { days }, String(days));
  const s = data?.series;
  return (
    <>
      <Heading sub="Dates use Kenya time." right={
        <div className="flex gap-1 rounded-lg bg-white p-1 ring-1 ring-line" role="group" aria-label="Range">
          {[7, 30, 90].map((d) => <button key={d} onClick={() => setDays(d)} aria-pressed={days === d} className={`rounded-md px-3 py-1.5 text-sm font-semibold ${days === d ? 'bg-ink text-white' : 'text-slate2'}`}>{d} days</button>)}
        </div>}>Analytics</Heading>
      {error && <p role="alert" className="text-red-600">{error.message}</p>}
      {loading && !s && <p className="text-slate2">Loading…</p>}
      {s && (
        <div className="grid gap-4 lg:grid-cols-2">
          <ChartCard title="Intern registrations" data={s.interns} x="day" y="n" />
          <ChartCard title="Company registrations" data={s.companies} x="day" y="n" color={GOLD} />
          <ChartCard title="Internship postings" data={s.internships} x="day" y="n" kind="bar" />
          <ChartCard title="Applications submitted" data={s.applications} x="day" y="n" kind="bar" color={GOLD} />
          <ChartCard title="Successful payments" data={s.payments} x="day" y="n" />
        </div>
      )}
      <h2 className="mb-3 mt-10 text-xl font-bold">Revenue</h2>
      <RevenueCharts />
      <p className="mt-6 text-sm text-slate2">Transactions and exports are under <Link to="/dashboard/admin/finance" className="font-semibold text-brand underline">Finance</Link>.</p>
    </>
  );
}

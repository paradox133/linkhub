import React, { useEffect, useState } from 'react'
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, ArcElement, Title, Tooltip, Legend, Filler
} from 'chart.js'
import { Line, Bar, Doughnut } from 'react-chartjs-2'
import { getStats, getClickTrend } from '../api'

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, ArcElement, Title, Tooltip, Legend, Filler
)

const CAT_PALETTE = {
  homelab: '#3b82f6',
  finance: '#22c55e',
  health: '#ef4444',
  media: '#a855f7',
  dev: '#eab308',
  ai: '#06b6d4',
  general: '#6b7280',
}

const chartDefaults = {
  responsive: true,
  plugins: {
    legend: { labels: { color: '#9ca3af' } },
    tooltip: {
      backgroundColor: '#1f2937',
      titleColor: '#f9fafb',
      bodyColor: '#d1d5db',
      borderColor: '#374151',
      borderWidth: 1,
    },
  },
}

export default function Analytics() {
  const [stats, setStats] = useState(null)
  const [trend, setTrend] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getStats(), getClickTrend(30)]).then(([s, t]) => {
      setStats(s)
      setTrend(t)
      setLoading(false)
    })
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-gray-400">Loading analytics…</div>
  )

  // Build full 30-day range
  const today = new Date()
  const days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(today)
    d.setDate(d.getDate() - (29 - i))
    return d.toISOString().split('T')[0]
  })
  const trendMap = Object.fromEntries(trend.map(t => [t.date, t.count]))
  const trendData = days.map(d => trendMap[d] || 0)

  const lineData = {
    labels: days.map(d => d.slice(5)),
    datasets: [{
      label: 'Clicks',
      data: trendData,
      borderColor: '#6366f1',
      backgroundColor: 'rgba(99,102,241,0.1)',
      fill: true,
      tension: 0.4,
      pointRadius: 2,
      pointHoverRadius: 5,
    }]
  }

  const topLinks = stats.topLinks.slice(0, 10)
  const barData = {
    labels: topLinks.map(l => `/${l.slug}`),
    datasets: [{
      label: 'Clicks',
      data: topLinks.map(l => l.clicks),
      backgroundColor: topLinks.map(l => (CAT_PALETTE[l.category] || '#6b7280') + 'cc'),
      borderColor: topLinks.map(l => CAT_PALETTE[l.category] || '#6b7280'),
      borderWidth: 1,
      borderRadius: 4,
    }]
  }

  const catData = stats.clicksByCategory
  const donutData = {
    labels: catData.map(c => c.category),
    datasets: [{
      data: catData.map(c => c.total),
      backgroundColor: catData.map(c => CAT_PALETTE[c.category] || '#6b7280'),
      borderColor: '#111827',
      borderWidth: 2,
    }]
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <h1 className="text-white text-xl font-bold mb-6">📊 Analytics</h1>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total Links', value: stats.totalLinks, icon: '🔗' },
          { label: 'Total Clicks', value: stats.totalClicks.toLocaleString(), icon: '👆' },
          { label: 'Avg Clicks/Link', value: stats.totalLinks ? Math.round(stats.totalClicks / stats.totalLinks) : 0, icon: '📈' },
        ].map(s => (
          <div key={s.label} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="text-2xl mb-1">{s.icon}</div>
            <div className="text-2xl font-bold text-white">{s.value}</div>
            <div className="text-gray-400 text-sm">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Line chart */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-5">
        <h2 className="text-white font-semibold mb-4">Clicks per Day (30 days)</h2>
        <Line
          data={lineData}
          options={{
            ...chartDefaults,
            scales: {
              x: { ticks: { color: '#6b7280', maxTicksLimit: 10 }, grid: { color: '#1f2937' } },
              y: { ticks: { color: '#6b7280' }, grid: { color: '#1f2937' }, beginAtZero: true },
            },
          }}
        />
      </div>

      <div className="grid grid-cols-2 gap-5">
        {/* Bar chart */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="text-white font-semibold mb-4">Top 10 Links</h2>
          {topLinks.length === 0 ? (
            <p className="text-gray-500 text-sm">No click data yet</p>
          ) : (
            <Bar
              data={barData}
              options={{
                ...chartDefaults,
                indexAxis: 'y',
                scales: {
                  x: { ticks: { color: '#6b7280' }, grid: { color: '#1f2937' }, beginAtZero: true },
                  y: { ticks: { color: '#9ca3af' }, grid: { display: false } },
                },
              }}
            />
          )}
        </div>

        {/* Donut chart */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="text-white font-semibold mb-4">Clicks by Category</h2>
          {catData.length === 0 ? (
            <p className="text-gray-500 text-sm">No data yet</p>
          ) : (
            <div className="flex items-center justify-center">
              <Doughnut
                data={donutData}
                options={{
                  ...chartDefaults,
                  cutout: '65%',
                  plugins: {
                    ...chartDefaults.plugins,
                    legend: { position: 'right', labels: { color: '#9ca3af', boxWidth: 12 } },
                  },
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

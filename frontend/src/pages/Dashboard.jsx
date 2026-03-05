import React, { useEffect, useState, useCallback } from 'react'
import { getLinks, createLink, updateLink, deleteLink, qrUrl } from '../api'

const CATEGORIES = ['all', 'homelab', 'finance', 'health', 'media', 'dev', 'ai', 'general']
const CAT_COLORS = {
  homelab: 'bg-blue-900/50 text-blue-300',
  finance: 'bg-green-900/50 text-green-300',
  health: 'bg-red-900/50 text-red-300',
  media: 'bg-purple-900/50 text-purple-300',
  dev: 'bg-yellow-900/50 text-yellow-300',
  ai: 'bg-cyan-900/50 text-cyan-300',
  general: 'bg-gray-700/50 text-gray-300',
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <button
      onClick={copy}
      className="relative text-gray-400 hover:text-white transition p-1 rounded"
      title="Copy link"
    >
      {copied ? (
        <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
          Copied!
        </span>
      ) : null}
      {copied ? (
        <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      )}
    </button>
  )
}

function QRModal({ slug, onClose }) {
  const url = qrUrl(slug)
  const handleDownload = async () => {
    const r = await fetch(url)
    const blob = await r.blob()
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${slug}-qr.png`
    a.click()
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-8 flex flex-col items-center gap-4 shadow-2xl" onClick={e => e.stopPropagation()}>
        <h3 className="text-white font-semibold text-lg">QR Code — <span className="text-indigo-400">/{slug}</span></h3>
        <div className="bg-gray-950 rounded-xl p-4">
          <img src={url} alt="QR Code" className="w-48 h-48" />
        </div>
        <p className="text-gray-400 text-xs">http://192.168.1.166:3088/r/{slug}</p>
        <div className="flex gap-3">
          <button
            onClick={handleDownload}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm transition"
          >
            ⬇ Download PNG
          </button>
          <button onClick={onClose} className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm transition">
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

function EditModal({ link, onClose, onSave }) {
  const [form, setForm] = useState({ ...link })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const save = async () => {
    setSaving(true)
    setError('')
    try {
      await onSave(link.id, form)
      onClose()
    } catch (e) {
      setError(e.error || 'Error saving')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
        <h3 className="text-white font-semibold text-lg mb-4">Edit Link</h3>
        {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
        <div className="space-y-3">
          {[
            { label: 'Slug', key: 'slug' },
            { label: 'Target URL', key: 'targetUrl' },
            { label: 'Title', key: 'title' },
          ].map(f => (
            <div key={f.key}>
              <label className="text-gray-400 text-xs mb-1 block">{f.label}</label>
              <input
                value={form[f.key] || ''}
                onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
              />
            </div>
          ))}
          <div>
            <label className="text-gray-400 text-xs mb-1 block">Category</label>
            <select
              value={form.category || 'general'}
              onChange={e => setForm({ ...form, category: e.target.value })}
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
            >
              {CATEGORIES.filter(c => c !== 'all').map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="active"
              checked={form.active === 1 || form.active === true}
              onChange={e => setForm({ ...form, active: e.target.checked ? 1 : 0 })}
              className="accent-indigo-500"
            />
            <label htmlFor="active" className="text-gray-300 text-sm">Active</label>
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <button
            onClick={save}
            disabled={saving}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm transition flex-1"
          >
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
          <button onClick={onClose} className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm transition">
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const [links, setLinks] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [qrSlug, setQrSlug] = useState(null)
  const [editLink, setEditLink] = useState(null)
  const [form, setForm] = useState({ slug: '', targetUrl: '', title: '', category: 'homelab' })
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const data = await getLinks()
    setLinks(data)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = filter === 'all' ? links : links.filter(l => l.category === filter)

  const totalClicks = links.reduce((s, l) => s + (l.clicks || 0), 0)
  const topLink = links.length ? links.reduce((a, b) => (b.clicks > a.clicks ? b : a)) : null

  const handleCreate = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setFormError('')
    try {
      await createLink(form)
      setForm({ slug: '', targetUrl: '', title: '', category: 'homelab' })
      await load()
    } catch (e) {
      setFormError(e.error || 'Error creating link')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this link?')) return
    await deleteLink(id)
    setLinks(links.filter(l => l.id !== id))
  }

  const handleEdit = async (id, data) => {
    const updated = await updateLink(id, data)
    setLinks(links.map(l => l.id === id ? updated : l))
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total Links', value: links.length, icon: '🔗' },
          { label: 'Total Clicks', value: totalClicks.toLocaleString(), icon: '👆' },
          { label: 'Most Popular', value: topLink ? topLink.slug : '—', icon: '🏆' },
        ].map(s => (
          <div key={s.label} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="text-2xl mb-1">{s.icon}</div>
            <div className="text-2xl font-bold text-white">{s.value}</div>
            <div className="text-gray-400 text-sm">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Create Form */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6">
        <h2 className="text-white font-semibold mb-4">➕ Add New Link</h2>
        <form onSubmit={handleCreate} className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-32">
            <label className="text-gray-400 text-xs mb-1 block">Slug *</label>
            <input
              required
              value={form.slug}
              onChange={e => setForm({ ...form, slug: e.target.value })}
              placeholder="e.g. myapp"
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div className="flex-[2] min-w-48">
            <label className="text-gray-400 text-xs mb-1 block">Target URL *</label>
            <input
              required
              value={form.targetUrl}
              onChange={e => setForm({ ...form, targetUrl: e.target.value })}
              placeholder="https://..."
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div className="flex-1 min-w-32">
            <label className="text-gray-400 text-xs mb-1 block">Title</label>
            <input
              value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
              placeholder="Display name"
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="text-gray-400 text-xs mb-1 block">Category</label>
            <select
              value={form.category}
              onChange={e => setForm({ ...form, category: e.target.value })}
              className="bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
            >
              {CATEGORIES.filter(c => c !== 'all').map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-5 py-2 rounded-lg text-sm font-medium transition"
          >
            {submitting ? 'Adding…' : 'Add Link'}
          </button>
        </form>
        {formError && <p className="text-red-400 text-sm mt-2">{formError}</p>}
      </div>

      {/* Category Tabs */}
      <div className="flex flex-wrap gap-2 mb-4">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`px-3 py-1.5 rounded-lg text-sm capitalize transition ${
              filter === cat
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            {cat === 'all' ? `All (${links.length})` : `${cat} (${links.filter(l => l.category === cat).length})`}
          </button>
        ))}
      </div>

      {/* Links Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No links yet</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-gray-400 text-xs uppercase">
                  <th className="px-4 py-3 text-left">Slug</th>
                  <th className="px-4 py-3 text-left">Title</th>
                  <th className="px-4 py-3 text-left">Target</th>
                  <th className="px-4 py-3 text-left">Category</th>
                  <th className="px-4 py-3 text-right">Clicks</th>
                  <th className="px-4 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(link => (
                  <tr key={link.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition">
                    <td className="px-4 py-3">
                      <span className="bg-indigo-900/50 text-indigo-300 border border-indigo-700/30 px-2 py-0.5 rounded-full text-xs font-mono font-medium">
                        /{link.slug}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-200">{link.title || '—'}</td>
                    <td className="px-4 py-3 max-w-xs">
                      <a
                        href={link.targetUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-400 hover:text-indigo-400 truncate block transition text-xs"
                      >
                        {link.targetUrl}
                      </a>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${CAT_COLORS[link.category] || CAT_COLORS.general}`}>
                        {link.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-white font-medium">{link.clicks || 0}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <CopyButton text={`http://192.168.1.166:3088/r/${link.slug}`} />
                        <button
                          onClick={() => setQrSlug(link.slug)}
                          className="text-gray-400 hover:text-white transition p-1 rounded"
                          title="QR Code"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => setEditLink(link)}
                          className="text-gray-400 hover:text-indigo-400 transition p-1 rounded"
                          title="Edit"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(link.id)}
                          className="text-gray-400 hover:text-red-400 transition p-1 rounded"
                          title="Delete"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      {qrSlug && <QRModal slug={qrSlug} onClose={() => setQrSlug(null)} />}
      {editLink && <EditModal link={editLink} onClose={() => setEditLink(null)} onSave={handleEdit} />}
    </div>
  )
}

import { useEffect, useMemo, useState } from 'react'

const BACKEND = import.meta.env.VITE_BACKEND_URL || ''

function StatusBadge({ value }) {
  const map = {
    unknown: 'bg-gray-100 text-gray-700',
    has_fb: 'bg-green-100 text-green-700',
    no_fb: 'bg-red-100 text-red-700',
    review: 'bg-yellow-100 text-yellow-700',
  }
  return (
    <span className={`px-2 py-1 rounded text-xs font-medium ${map[value] || map.unknown}`}>
      {value}
    </span>
  )
}

function Row({ item, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ phone: item.phone, country: item.country || '', status: item.status, note: item.note || '' })

  const save = async () => {
    const res = await fetch(`${BACKEND}/phones/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    })
    if (res.ok) {
      onUpdate()
      setEditing(false)
    }
  }

  const del = async () => {
    if (!confirm('Delete this row?')) return
    const res = await fetch(`${BACKEND}/phones/${item.id}`, { method: 'DELETE' })
    if (res.ok) onDelete()
  }

  if (editing) {
    return (
      <tr className="border-b">
        <td className="p-2"><input className="input" value={form.phone} onChange={e=>setForm({ ...form, phone: e.target.value })} /></td>
        <td className="p-2"><input className="input" value={form.country} onChange={e=>setForm({ ...form, country: e.target.value })} /></td>
        <td className="p-2">
          <select className="input" value={form.status} onChange={e=>setForm({ ...form, status: e.target.value })}>
            <option value="unknown">unknown</option>
            <option value="has_fb">has_fb</option>
            <option value="no_fb">no_fb</option>
            <option value="review">review</option>
          </select>
        </td>
        <td className="p-2"><input className="input" value={form.note} onChange={e=>setForm({ ...form, note: e.target.value })} /></td>
        <td className="p-2 flex gap-2">
          <button className="btn btn-primary" onClick={save}>Save</button>
          <button className="btn" onClick={()=>setEditing(false)}>Cancel</button>
        </td>
      </tr>
    )
  }

  return (
    <tr className="border-b">
      <td className="p-2 font-mono">{item.phone}</td>
      <td className="p-2">{item.country || '-'}</td>
      <td className="p-2"><StatusBadge value={item.status} /></td>
      <td className="p-2 text-gray-600">{item.note || '-'}</td>
      <td className="p-2 flex gap-2">
        <button className="btn btn-primary" onClick={()=>setEditing(true)}>Edit</button>
        <button className="btn btn-danger" onClick={del}>Delete</button>
      </td>
    </tr>
  )
}

function App() {
  const [items, setItems] = useState([])
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(false)
  const [adding, setAdding] = useState({ phone: '', country: '', status: 'unknown', note: '' })
  const [bulkText, setBulkText] = useState('')

  const fetchData = async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    if (status) params.set('status', status)
    const res = await fetch(`${BACKEND}/phones?${params.toString()}`)
    const data = await res.json()
    setItems(data.items || [])
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  const addOne = async () => {
    if (!adding.phone.trim()) return
    await fetch(`${BACKEND}/phones`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(adding)
    })
    setAdding({ phone: '', country: '', status: 'unknown', note: '' })
    fetchData()
  }

  const bulkImport = async () => {
    // Accept lines: phone[,country][,status][,note]
    const lines = bulkText.split('\n').map(l=>l.trim()).filter(Boolean)
    const items = lines.map(l=>{
      const [phone, country='', status='unknown', ...rest] = l.split(',')
      const note = rest.join(',').trim()
      return { phone: phone.trim(), country: country.trim(), status: status.trim()||'unknown', note }
    }).filter(x=>x.phone)

    if (!items.length) return
    await fetch(`${BACKEND}/phones/bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items })
    })
    setBulkText('')
    fetchData()
  }

  const exportCsv = async () => {
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    if (status) params.set('status', status)
    const res = await fetch(`${BACKEND}/phones/export?${params.toString()}`)
    const text = await res.text()
    const blob = new Blob([text], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'phones.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 bg-white border-b z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
          <h1 className="text-2xl font-bold">Phone Status Tracker</h1>
          <div className="flex gap-2">
            <input className="input" placeholder="Search" value={q} onChange={e=>setQ(e.target.value)} />
            <select className="input" value={status} onChange={e=>setStatus(e.target.value)}>
              <option value="">All</option>
              <option value="unknown">unknown</option>
              <option value="has_fb">has_fb</option>
              <option value="no_fb">no_fb</option>
              <option value="review">review</option>
            </select>
            <button className="btn" onClick={fetchData}>Refresh</button>
            <button className="btn" onClick={exportCsv}>Export CSV</button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white p-4 rounded-lg shadow">
            <h2 className="font-semibold mb-3">Add a number</h2>
            <div className="grid grid-cols-2 gap-2">
              <input className="input" placeholder="Phone" value={adding.phone} onChange={e=>setAdding({ ...adding, phone: e.target.value })} />
              <input className="input" placeholder="Country" value={adding.country} onChange={e=>setAdding({ ...adding, country: e.target.value })} />
              <select className="input" value={adding.status} onChange={e=>setAdding({ ...adding, status: e.target.value })}>
                <option value="unknown">unknown</option>
                <option value="has_fb">has_fb</option>
                <option value="no_fb">no_fb</option>
                <option value="review">review</option>
              </select>
              <input className="input col-span-2" placeholder="Note" value={adding.note} onChange={e=>setAdding({ ...adding, note: e.target.value })} />
            </div>
            <div className="mt-3"><button className="btn btn-primary" onClick={addOne}>Add</button></div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow">
            <h2 className="font-semibold mb-3">Bulk paste (one per line)</h2>
            <textarea className="input h-32" placeholder="phone,country,status,note" value={bulkText} onChange={e=>setBulkText(e.target.value)} />
            <div className="mt-3"><button className="btn" onClick={bulkImport}>Import</button></div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-100 text-left">
                <th className="p-2">Phone</th>
                <th className="p-2">Country</th>
                <th className="p-2">Status</th>
                <th className="p-2">Note</th>
                <th className="p-2 w-40">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="p-4 text-center text-gray-500">Loading...</td></tr>
              ) : items.length ? (
                items.map(item => (
                  <Row key={item.id} item={item} onUpdate={fetchData} onDelete={fetchData} />
                ))
              ) : (
                <tr><td colSpan={5} className="p-4 text-center text-gray-500">No data</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </main>

      <style>{`
        .btn { @apply px-3 py-2 rounded border border-slate-300 bg-white hover:bg-slate-50; }
        .btn-primary { @apply bg-blue-600 text-white border-blue-600 hover:bg-blue-700; }
        .btn-danger { @apply bg-red-600 text-white border-red-600 hover:bg-red-700; }
        .input { @apply w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500; }
      `}</style>
    </div>
  )
}

export default App

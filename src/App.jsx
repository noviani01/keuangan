import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import {
  ArrowDownLeft, ArrowRight, ArrowUpRight, BadgePlus, Banknote, CalendarDays,
  Check, ChevronDown, CircleHelp, CreditCard, FileText, Filter, Home, LogOut,
  Menu, Plus, Search, Settings2, ShoppingBag, Sparkles, TrendingDown,
  TrendingUp, Utensils, Wallet, X,
} from 'lucide-react'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null

const categoryOptions = {
  expense: ['Makanan & minuman', 'Transportasi', 'Belanja', 'Tagihan', 'Hiburan', 'Kesehatan', 'Lainnya'],
  income: ['Gaji', 'Freelance', 'Investasi', 'Hadiah', 'Bisnis', 'Lainnya'],
}

const demoTransactions = [
  { id: 'demo-1', type: 'income', amount: 8500000, category: 'Gaji', description: 'Gaji bulanan', transaction_date: '2026-10-22' },
  { id: 'demo-2', type: 'expense', amount: 125000, category: 'Makanan & minuman', description: 'Makan siang bersama tim', transaction_date: '2026-10-22' },
  { id: 'demo-3', type: 'expense', amount: 450000, category: 'Transportasi', description: 'Isi saldo transportasi', transaction_date: '2026-10-21' },
  { id: 'demo-4', type: 'expense', amount: 680000, category: 'Belanja', description: 'Belanja kebutuhan rumah', transaction_date: '2026-10-20' },
  { id: 'demo-5', type: 'income', amount: 1250000, category: 'Freelance', description: 'Proyek desain', transaction_date: '2026-10-19' },
]

const currency = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })
const compactCurrency = (value) => value >= 1000000
  ? `Rp ${(value / 1000000).toLocaleString('id-ID', { maximumFractionDigits: 1 })} jt`
  : currency.format(value)
const formatDate = (value) => new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${value}T00:00:00`))
const initials = (email = '') => email.slice(0, 2).toUpperCase() || 'RK'

function App() {
  const [session, setSession] = useState(null)
  const [authReady, setAuthReady] = useState(false)
  const [transactions, setTransactions] = useState(demoTransactions)
  const [loading, setLoading] = useState(false)
  const [authMode, setAuthMode] = useState('login')
  const [authMessage, setAuthMessage] = useState('')
  const [authBusy, setAuthBusy] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [transactionType, setTransactionType] = useState('expense')
  const [formBusy, setFormBusy] = useState(false)
  const [formError, setFormError] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [period, setPeriod] = useState('month')
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [notice, setNotice] = useState('')

  useEffect(() => {
    if (!supabase) {
      setAuthReady(true)
      return undefined
    }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setAuthReady(true)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession))
    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session?.user) {
      setTransactions(demoTransactions)
      return undefined
    }
    let active = true
    setLoading(true)
    supabase.from('transactions').select('*')
      .order('transaction_date', { ascending: false })
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (!active) return
        if (error) setNotice(`Data belum dapat dimuat: ${error.message}`)
        else setTransactions(data || [])
        setLoading(false)
      })
    return () => { active = false }
  }, [session])

  useEffect(() => {
    if (!notice) return undefined
    const timer = window.setTimeout(() => setNotice(''), 4200)
    return () => window.clearTimeout(timer)
  }, [notice])

  const thisMonth = new Date().toISOString().slice(0, 7)
  const monthTransactions = useMemo(() => transactions.filter((item) => item.transaction_date?.startsWith(thisMonth)), [transactions, thisMonth])
  const totals = useMemo(() => monthTransactions.reduce((result, item) => {
    result[item.type] += Number(item.amount)
    return result
  }, { income: 0, expense: 0 }), [monthTransactions])
  const balance = totals.income - totals.expense
  const spendingRatio = totals.income ? Math.min((totals.expense / totals.income) * 100, 100) : 0
  const filteredTransactions = useMemo(() => transactions.filter((item) => {
    const matchesType = filterType === 'all' || item.type === filterType
    const query = searchTerm.trim().toLowerCase()
    const matchesSearch = !query || `${item.description} ${item.category}`.toLowerCase().includes(query)
    const matchesPeriod = period === 'all' || item.transaction_date?.startsWith(thisMonth)
    return matchesType && matchesSearch && matchesPeriod
  }), [transactions, filterType, searchTerm, period, thisMonth])
  const categorySpending = useMemo(() => {
    const categoryTotals = monthTransactions.filter((item) => item.type === 'expense').reduce((result, item) => {
      result[item.category] = (result[item.category] || 0) + Number(item.amount)
      return result
    }, {})
    return Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]).slice(0, 4)
  }, [monthTransactions])
  const topCategoryTotal = categorySpending[0]?.[1] || 1

  const submitAuth = async (event) => {
    event.preventDefault()
    if (!supabase) return
    setAuthBusy(true)
    setAuthMessage('')
    const formData = new FormData(event.currentTarget)
    const email = formData.get('email')
    const password = formData.get('password')
    const result = authMode === 'signup'
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password })
    if (result.error) setAuthMessage(result.error.message)
    else if (authMode === 'signup' && !result.data.session) setAuthMessage('Cek email Anda untuk mengonfirmasi akun.')
    else setAuthMessage('')
    setAuthBusy(false)
  }

  const submitTransaction = async (event) => {
    event.preventDefault()
    setFormError('')
    setFormBusy(true)
    const formData = new FormData(event.currentTarget)
    const transaction = {
      type: transactionType,
      amount: Number(formData.get('amount')),
      category: formData.get('category'),
      description: formData.get('description').trim(),
      transaction_date: formData.get('transaction_date'),
    }
    if (session?.user) {
      const { data, error } = await supabase.from('transactions').insert({ ...transaction, user_id: session.user.id }).select().single()
      if (error) {
        setFormError(error.message)
        setFormBusy(false)
        return
      }
      setTransactions((current) => [data, ...current])
    } else {
      setTransactions((current) => [{ ...transaction, id: `local-${Date.now()}` }, ...current])
      setNotice('Transaksi tersimpan di sesi ini. Masuk untuk menyimpan permanen.')
    }
    setFormBusy(false)
    setShowForm(false)
  }

  const deleteTransaction = async (id) => {
    if (session?.user) {
      const { error } = await supabase.from('transactions').delete().eq('id', id)
      if (error) {
        setNotice(`Transaksi gagal dihapus: ${error.message}`)
        return
      }
    }
    setTransactions((current) => current.filter((item) => item.id !== id))
  }

  const signOut = async () => { if (supabase) await supabase.auth.signOut() }

  if (!authReady) return <div className="boot-screen"><span className="brand-mark"><Wallet size={19} /></span></div>
  if (!session) return <AuthScreen mode={authMode} setMode={(mode) => { setAuthMode(mode); setAuthMessage('') }} onSubmit={submitAuth} busy={authBusy} message={authMessage} configured={Boolean(supabase)} />

  const userEmail = session.user.email || 'Pengguna Ruang Kas'

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNavOpen ? 'sidebar-open' : ''}`}>
        <a className="brand" href="#dashboard" aria-label="Ruang Kas beranda"><span className="brand-mark"><Wallet size={19} strokeWidth={2.2} /></span><span>ruang<span className="brand-light">kas</span></span></a>
        <div className="workspace-label">WORKSPACE</div>
        <nav className="side-nav" aria-label="Navigasi utama">
          <a className="nav-item active" href="#dashboard" onClick={() => setMobileNavOpen(false)}><Home size={17} /> Ringkasan</a>
          <a className="nav-item" href="#transactions" onClick={() => setMobileNavOpen(false)}><FileText size={17} /> Transaksi</a>
          <a className="nav-item" href="#spending" onClick={() => setMobileNavOpen(false)}><TrendingDown size={17} /> Pengeluaran</a>
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-tip"><span className="tip-icon"><Sparkles size={15} /></span><p>Langkah kecil hari ini, keuangan lebih baik esok.</p><span className="tip-accent">01 / 03</span></div>
          <button className="nav-item settings-item" type="button" onClick={() => setNotice('Pengaturan akun tersedia melalui menu profil.')}><Settings2 size={17} /> Pengaturan</button>
          <div className="profile-row"><span className="avatar">{initials(userEmail)}</span><span className="profile-copy"><strong>{userEmail.split('@')[0]}</strong><small>{userEmail}</small></span><button className="icon-button profile-logout" title="Keluar" onClick={signOut}><LogOut size={16} /></button></div>
        </div>
      </aside>

      <main className="main-content" id="dashboard">
        <header className="topbar"><button className="icon-button mobile-menu" aria-label="Buka navigasi" onClick={() => setMobileNavOpen(!mobileNavOpen)}><Menu size={20} /></button><div className="breadcrumb">Workspace <ArrowRight size={13} /> <strong>Ringkasan</strong></div><div className="topbar-actions"><span className="today-date"><CalendarDays size={15} /> {new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date())}</span><button className="top-avatar" title={`Akun ${userEmail}`}>{initials(userEmail)}</button></div></header>
        <div className="page-wrap">
          <section className="page-heading"><div><p className="eyebrow">RINGKASAN KEUANGAN</p><h1>Selamat datang, {userEmail.split('@')[0]}<span className="heading-period">.</span></h1><p className="heading-subtitle">Ini gambaran singkat kondisi keuanganmu.</p></div><button className="primary-button" onClick={() => { setTransactionType('expense'); setShowForm(true) }}><Plus size={17} /> Catat transaksi</button></section>

          <section className="summary-grid" aria-label="Ringkasan bulan ini">
            <article className="summary-card balance-card"><div className="summary-top"><span className="summary-label">SALDO BULAN INI</span><span className="summary-icon balance-icon"><Wallet size={17} /></span></div><div className="summary-value">{currency.format(balance)}</div><div className="summary-foot"><span className={`change-pill ${balance >= 0 ? 'positive' : 'negative'}`}>{balance >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}{totals.income ? `${Math.round((balance / totals.income) * 100)}%` : '0%'}</span><span>dari total pemasukan</span></div><div className="balance-lines" aria-hidden="true">{Array.from({ length: 12 }, (_, index) => <i key={index} />)}</div></article>
            <article className="summary-card"><div className="summary-top"><span className="summary-label">PEMASUKAN</span><span className="summary-icon income-icon"><ArrowDownLeft size={17} /></span></div><div className="summary-value">{currency.format(totals.income)}</div><div className="summary-foot"><span className="metric-dot income-dot" /> <span>Bulan ini</span></div><div className="metric-line"><span className="income-line" style={{ width: `${totals.income ? 100 : 5}%` }} /></div></article>
            <article className="summary-card"><div className="summary-top"><span className="summary-label">PENGELUARAN</span><span className="summary-icon expense-icon"><ArrowUpRight size={17} /></span></div><div className="summary-value">{currency.format(totals.expense)}</div><div className="summary-foot"><span className="metric-dot expense-dot" /> <span>{Math.round(spendingRatio)}% dari pemasukan</span></div><div className="metric-line"><span className="expense-line" style={{ width: `${Math.max(spendingRatio, 3)}%` }} /></div></article>
          </section>

          <section className="insights-grid">
            <article className="panel spending-panel" id="spending"><div className="panel-heading"><div><h2>Ke mana uangmu pergi?</h2><p>Rincian pengeluaran bulan ini</p></div><button className="text-button" onClick={() => { setFilterType('expense'); document.getElementById('transactions')?.scrollIntoView({ behavior: 'smooth' }) }}>Lihat transaksi <ArrowRight size={14} /></button></div><div className="spending-total"><strong>{currency.format(totals.expense)}</strong><span>total pengeluaran</span></div><div className="category-list">{categorySpending.length ? categorySpending.map(([category, amount], index) => <CategoryRow key={category} category={category} amount={amount} width={Math.max((amount / topCategoryTotal) * 100, 6)} index={index} />) : <div className="empty-category">Belum ada pengeluaran bulan ini. Catat transaksi pertamamu.</div>}</div></article>
            <article className="panel cashflow-panel"><div className="panel-heading"><div><h2>Arus kas</h2><p>Aktivitas keuanganmu</p></div><button className="period-select" onClick={() => setPeriod(period === 'month' ? 'all' : 'month')}>{period === 'month' ? 'Bulan ini' : 'Semua'} <ChevronDown size={14} /></button></div><div className="cashflow-graphic"><div className="cashflow-labels"><div><span className="legend-dot income-dot" /> Pemasukan <strong>{compactCurrency(totals.income)}</strong></div><div><span className="legend-dot expense-dot" /> Pengeluaran <strong>{compactCurrency(totals.expense)}</strong></div></div><div className="flow-bars" aria-label={`Pemasukan ${currency.format(totals.income)}, pengeluaran ${currency.format(totals.expense)}`}><div className="flow-bar-group"><div className="flow-bar income-bar" style={{ height: `${totals.income ? Math.max(30, Math.min(100, (totals.income / Math.max(totals.income, totals.expense)) * 100)) : 8}%` }}><span>{totals.income ? '↑' : '–'}</span></div><small>Masuk</small></div><div className="flow-bar-group"><div className="flow-bar expense-bar" style={{ height: `${totals.expense ? Math.max(30, Math.min(100, (totals.expense / Math.max(totals.income, totals.expense)) * 100)) : 8}%` }}><span>{totals.expense ? '↓' : '–'}</span></div><small>Keluar</small></div></div><div className="cashflow-foot"><span><span className="status-dot" /> Arus kas bersih</span><strong className={balance < 0 ? 'negative-text' : ''}>{currency.format(balance)}</strong></div></div></article>
          </section>

          <section className="panel transactions-panel" id="transactions"><div className="transactions-heading"><div><h2>Transaksi terbaru</h2><p>Catatan pemasukan dan pengeluaranmu</p></div><button className="outline-button" onClick={() => { setTransactionType('income'); setShowForm(true) }}><BadgePlus size={16} /> Tambah transaksi</button></div><div className="transaction-toolbar"><div className="transaction-tabs" role="tablist" aria-label="Filter jenis transaksi">{[['all', 'Semua'], ['income', 'Pemasukan'], ['expense', 'Pengeluaran']].map(([value, label]) => <button key={value} role="tab" aria-selected={filterType === value} className={filterType === value ? 'selected' : ''} onClick={() => setFilterType(value)}>{label}</button>)}</div><div className="table-tools"><label className="search-box"><Search size={15} /><input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Cari transaksi" aria-label="Cari transaksi" />{searchTerm && <button aria-label="Hapus pencarian" onClick={() => setSearchTerm('')}><X size={13} /></button>}</label><button className="filter-button" onClick={() => setPeriod(period === 'month' ? 'all' : 'month')} title="Ganti periode"><Filter size={15} /><span>{period === 'month' ? 'Bulan ini' : 'Semua'}</span></button></div></div><TransactionTable transactions={filteredTransactions.slice(0, 8)} onDelete={deleteTransaction} loading={loading} />{filteredTransactions.length > 8 && <button className="load-more" onClick={() => setPeriod('all')}>Lihat semua transaksi <ArrowRight size={14} /></button>}{!session && <div className="demo-note"><CircleHelp size={14} /> Data contoh. Masuk melalui konfigurasi Supabase untuk menyimpan transaksi secara permanen.</div>}</section>
          <footer className="page-footer"><span>Ruang Kas <span className="footer-dot">/</span> Keuangan lebih tertata.</span><span>Data kamu, kendali kamu.</span></footer>
        </div>
      </main>

      {mobileNavOpen && <button aria-label="Tutup navigasi" className="mobile-scrim" onClick={() => setMobileNavOpen(false)} />}
      {notice && <div className="toast" role="status"><Check size={16} /> {notice}<button aria-label="Tutup notifikasi" onClick={() => setNotice('')}><X size={15} /></button></div>}
      {showForm && <TransactionModal type={transactionType} setType={setTransactionType} onClose={() => setShowForm(false)} onSubmit={submitTransaction} busy={formBusy} error={formError} />}
    </div>
  )
}

function AuthScreen({ mode, setMode, onSubmit, busy, message, configured }) {
  const isSignup = mode === 'signup'
  return <main className="auth-page"><section className="auth-story"><a className="brand auth-brand" href="#"><span className="brand-mark"><Wallet size={19} /></span><span>ruang<span className="brand-light">kas</span></span></a><div className="story-content"><span className="story-kicker"><span /> RAPIKAN ARUS KASMU</span><h1>Uangmu bekerja lebih baik saat kamu <em>mengenalnya.</em></h1><p>Catat pemasukan dan pengeluaran dalam satu ruang yang sederhana. Lihat kebiasaanmu, lalu tentukan langkah berikutnya.</p><div className="story-stat"><div className="stat-avatars"><span>AN</span><span>DI</span><span>RA</span><span>+</span></div><span>Mulai menata keuangan hari ini</span></div></div><div className="story-bottom"><span>KEUANGAN LEBIH TERTATA</span><span>01 — 2026</span></div><div className="story-orbit orbit-one" /><div className="story-orbit orbit-two" /></section><section className="auth-side"><div className="auth-mobile-brand"><a className="brand" href="#"><span className="brand-mark"><Wallet size={19} /></span><span>ruang<span className="brand-light">kas</span></span></a></div><div className="auth-form-wrap"><div className="auth-heading"><span className="auth-overline">{isSignup ? 'MULAI DARI SINI' : 'SENANG MELIHATMU LAGI'}</span><h2>{isSignup ? 'Buat akun baru' : 'Masuk ke akunmu'}</h2><p>{isSignup ? 'Satu langkah kecil menuju keuangan yang lebih rapi.' : 'Lanjutkan kebiasaan baik mengatur keuangan.'}</p></div>{!configured && <div className="setup-alert"><CircleHelp size={17} /><span>Login perlu konfigurasi Supabase. Tambahkan URL dan anon key di file <code>.env</code> setelah menyiapkan database.</span></div>}<form className="auth-form" onSubmit={onSubmit}><label>Email<span className="input-wrap"><span className="input-symbol">@</span><input type="email" name="email" placeholder="nama@email.com" autoComplete="email" required disabled={!configured} /></span></label><label>Kata sandi<span className="input-wrap"><span className="input-symbol"><CreditCard size={16} /></span><input type="password" name="password" placeholder="Minimal 6 karakter" autoComplete={isSignup ? 'new-password' : 'current-password'} minLength="6" required disabled={!configured} /></span></label>{!isSignup && <div className="auth-options"><label className="remember-option"><input type="checkbox" /> <span>Ingat saya</span></label><span className="password-hint">Gunakan sandi minimal 6 karakter</span></div>}{message && <div className="auth-message" role="status">{message}</div>}<button className="auth-submit" type="submit" disabled={!configured || busy}>{busy ? 'Memproses...' : isSignup ? 'Buat akun' : 'Masuk'} <ArrowRight size={16} /></button></form><div className="auth-switch">{isSignup ? 'Sudah punya akun?' : 'Belum punya akun?'} <button onClick={() => setMode(isSignup ? 'login' : 'signup')}>{isSignup ? 'Masuk' : 'Daftar gratis'}</button></div><div className="auth-secure"><span><Check size={13} /></span> Data keuanganmu terlindungi dan bersifat pribadi</div></div><div className="auth-footer"><span>© 2026 Ruang Kas</span><button type="button" onClick={() => window.open('https://supabase.com/docs/guides/auth', '_blank', 'noopener,noreferrer')}>Bantuan masuk <ArrowUpRight size={13} /></button></div></section></main>
}

function CategoryRow({ category, amount, width, index }) {
  const categoryIcons = [ShoppingBag, Utensils, Banknote, CreditCard]
  const Icon = categoryIcons[index % categoryIcons.length]
  return <div className="category-row"><span className={`category-symbol category-${index}`}><Icon size={15} /></span><div className="category-info"><div className="category-main"><strong>{category}</strong><span>{currency.format(amount)}</span></div><div className="category-track"><span className={`category-fill fill-${index}`} style={{ width: `${width}%` }} /></div></div></div>
}

function TransactionTable({ transactions, onDelete, loading }) {
  if (loading) return <div className="table-empty"><span className="loader" /> Memuat transaksi...</div>
  if (!transactions.length) return <div className="table-empty"><span className="empty-icon"><Banknote size={18} /></span><strong>Belum ada transaksi</strong><span>Ubah filter atau catat transaksi pertamamu.</span></div>
  return <div className="table-scroll"><table><thead><tr><th>TRANSAKSI</th><th>KATEGORI</th><th>TANGGAL</th><th className="amount-heading">JUMLAH</th><th aria-label="Aksi" /></tr></thead><tbody>{transactions.map((item) => <tr key={item.id}><td><div className="transaction-name"><span className={`transaction-icon ${item.type}`}><TransactionIcon category={item.category} type={item.type} /></span><span><strong>{item.description || item.category}</strong><small>{item.type === 'income' ? 'Pemasukan' : 'Pengeluaran'}</small></span></div></td><td><span className="category-tag">{item.category}</span></td><td className="date-cell">{formatDate(item.transaction_date)}</td><td className={`amount-cell ${item.type}`}>{item.type === 'income' ? '+' : '-'}{currency.format(Number(item.amount))}</td><td className="row-action"><button title="Hapus transaksi" aria-label={`Hapus ${item.description || item.category}`} onClick={() => onDelete(item.id)}><X size={15} /></button></td></tr>)}</tbody></table></div>
}

function TransactionIcon({ category, type }) {
  if (type === 'income') return <ArrowDownLeft size={16} />
  if (category === 'Makanan & minuman') return <Utensils size={15} />
  if (category === 'Transportasi') return <ArrowRight size={15} />
  if (category === 'Belanja') return <ShoppingBag size={15} />
  return <CreditCard size={15} />
}

function TransactionModal({ type, setType, onClose, onSubmit, busy, error }) {
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><section className="transaction-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><div className="modal-heading"><div><span className="eyebrow">TRANSAKSI BARU</span><h2 id="modal-title">Catat uangmu</h2></div><button className="icon-button" aria-label="Tutup" onClick={onClose}><X size={19} /></button></div><form onSubmit={onSubmit}><div className="type-switch" role="tablist" aria-label="Jenis transaksi"><button type="button" role="tab" aria-selected={type === 'expense'} className={type === 'expense' ? 'active expense-tab' : ''} onClick={() => setType('expense')}><ArrowUpRight size={16} /> Pengeluaran</button><button type="button" role="tab" aria-selected={type === 'income'} className={type === 'income' ? 'active income-tab' : ''} onClick={() => setType('income')}><ArrowDownLeft size={16} /> Pemasukan</button></div><label className="field-label">Jumlah<div className="amount-input"><span>Rp</span><input name="amount" type="number" min="1" step="1" placeholder="0" required autoFocus /></div></label><label className="field-label">Kategori<select name="category" key={type} required defaultValue=""><option value="" disabled>Pilih kategori</option>{categoryOptions[type].map((category) => <option key={category}>{category}</option>)}</select></label><label className="field-label">Keterangan<input name="description" type="text" placeholder="Contoh: makan siang" maxLength="120" /></label><label className="field-label">Tanggal<input name="transaction_date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required /></label>{error && <div className="form-error" role="alert">{error}</div>}<div className="modal-actions"><button className="cancel-button" type="button" onClick={onClose}>Batal</button><button className="primary-button" type="submit" disabled={busy}>{busy ? 'Menyimpan...' : <><Check size={16} /> Simpan transaksi</>}</button></div></form></section></div>
}

export default App
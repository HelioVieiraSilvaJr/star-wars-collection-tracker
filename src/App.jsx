import { useEffect, useMemo, useState } from 'react';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import {
  BadgeDollarSign,
  BookOpen,
  ExternalLink,
  Filter,
  Gauge,
  LogOut,
  Plus,
  Radar,
  Search,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { auth, db } from './firebase.js';
import { categoryOptions, seedOpportunities, statusOptions } from './data.js';

const OWNER_EMAIL = 'helio.engenharia@gmail.com';
const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

function App() {
  const [user, setUser] = useState(undefined);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('Todos');
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => onAuthStateChanged(auth, setUser), []);

  useEffect(() => {
    if (!user || user.email !== OWNER_EMAIL) {
      return undefined;
    }

    const opportunitiesQuery = query(collection(db, 'opportunities'), orderBy('createdAt', 'desc'));
    return onSnapshot(
      opportunitiesQuery,
      async (snapshot) => {
        if (snapshot.empty) {
          await Promise.all(
            seedOpportunities.map((item) =>
              addDoc(collection(db, 'opportunities'), {
                ...item,
                discoveredAt: serverTimestamp(),
                lastCheckedAt: serverTimestamp(),
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
              }),
            ),
          );
          return;
        }
        setItems(snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() })));
        setLoading(false);
      },
      () => setLoading(false),
    );
  }, [user]);

  const filteredItems = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('pt-BR');
    return items.filter((item) => {
      const matchesStatus = statusFilter === 'Todos' || item.status === statusFilter;
      const haystack = `${item.title} ${item.collection} ${item.platform} ${item.category || ''}`.toLocaleLowerCase('pt-BR');
      return matchesStatus && (!term || haystack.includes(term));
    });
  }, [items, search, statusFilter]);

  const stats = useMemo(() => ({
    total: items.length,
    purchased: items.filter((item) => item.status === 'Comprado').length,
    invested: items
      .filter((item) => item.status === 'Comprado')
      .reduce((sum, item) => sum + Number(item.price || 0), 0),
    radar: items.filter((item) => ['Avaliando', 'Wishlist'].includes(item.status)).length,
  }), [items]);

  async function handleLogin() {
    setAuthError('');
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ login_hint: OWNER_EMAIL });
      const result = await signInWithPopup(auth, provider);
      if (result.user.email !== OWNER_EMAIL) {
        await signOut(auth);
        setAuthError('Use a conta Google autorizada para este acervo.');
      }
    } catch (error) {
      setAuthError(error.code === 'auth/popup-closed-by-user'
        ? 'O login foi cancelado.'
        : 'Não foi possível entrar. Tente novamente.');
    }
  }

  async function updateStatus(id, status) {
    await updateDoc(doc(db, 'opportunities', id), {
      status,
      updatedAt: serverTimestamp(),
      lastCheckedAt: serverTimestamp(),
      acquiredAt: status === 'Comprado' ? serverTimestamp() : null,
    });
  }

  async function removeItem(item) {
    if (window.confirm(`Remover “${item.title}” do tracker?`)) {
      await deleteDoc(doc(db, 'opportunities', item.id));
    }
  }

  async function addItem(event) {
    event.preventDefault();
    setSaving(true);
    const data = new FormData(event.currentTarget);
    await addDoc(collection(db, 'opportunities'), {
      title: data.get('title').trim(),
      collection: data.get('collection').trim(),
      category: data.get('category'),
      platform: data.get('platform').trim(),
      price: Number(data.get('price')),
      condition: data.get('condition').trim(),
      status: data.get('status'),
      url: data.get('url').trim(),
      notes: data.get('notes').trim(),
      discoveredAt: serverTimestamp(),
      lastCheckedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    setSaving(false);
    setShowForm(false);
  }

  if (user === undefined) return <div className="boot"><div className="loader" /></div>;
  if (!user || user.email !== OWNER_EMAIL) {
    return (
      <main className="login-page">
        <div className="stars stars-a" />
        <div className="stars stars-b" />
        <section className="login-card">
          <div className="rebel-mark"><Radar size={34} /></div>
          <p className="eyebrow">ACERVO PESSOAL</p>
          <h1>STAR WARS<br /><span>COLLECTION TRACKER</span></h1>
          <p className="login-copy">Seu radar particular para oportunidades, wishlist e peças já conquistadas.</p>
          <button className="primary-button login-button" onClick={handleLogin}>
            <ShieldCheck size={19} /> Entrar com Google
          </button>
          {authError && <p className="form-error">{authError}</p>}
          <small>Acesso protegido e exclusivo do proprietário.</small>
        </section>
      </main>
    );
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-icon"><Radar size={23} /></div>
          <div><strong>COLLECTION TRACKER</strong><span>STAR WARS ARCHIVE</span></div>
        </div>
        <div className="profile">
          <span>{user.displayName || 'Hélio'}</span>
          {user.photoURL && <img src={user.photoURL} alt="Avatar" referrerPolicy="no-referrer" />}
          <button className="icon-button" onClick={() => signOut(auth)} title="Sair"><LogOut size={17} /></button>
        </div>
      </header>

      <main className="content">
        <section className="hero">
          <div>
            <p className="eyebrow"><Sparkles size={14} /> HOLOCRON DO COLECIONADOR</p>
            <h2>A galáxia da sua coleção,<br /><span>sob controle.</span></h2>
            <p>Acompanhe cada oportunidade, negocie com contexto e registre suas conquistas.</p>
          </div>
          <button className="primary-button" onClick={() => setShowForm(true)}><Plus size={19} /> Nova oportunidade</button>
        </section>

        <section className="stats-grid">
          <Stat icon={BookOpen} label="Itens rastreados" value={stats.total} />
          <Stat icon={Radar} label="No radar" value={stats.radar} accent />
          <Stat icon={ShoppingBag} label="Conquistados" value={stats.purchased} />
          <Stat icon={BadgeDollarSign} label="Valor investido" value={currency.format(stats.invested)} />
        </section>

        <section className="tracker-panel">
          <div className="panel-heading">
            <div><p className="eyebrow"><Gauge size={14} /> RADAR ATIVO</p><h3>Oportunidades</h3></div>
            <div className="controls">
              <label className="search-box"><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar coleção..." /></label>
              <label className="select-box"><Filter size={16} /><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option>Todos</option>{statusOptions.map((status) => <option key={status}>{status}</option>)}</select></label>
            </div>
          </div>

          {loading ? <div className="empty"><div className="loader" /></div> : (
            <div className="cards-grid">
              {filteredItems.map((item) => (
                <article className="opportunity-card" key={item.id}>
                  <div className="card-top"><span className={`platform platform-${item.platform.toLowerCase().replace(/\s/g, '-')}`}>{item.platform}</span><button className="icon-button danger" onClick={() => removeItem(item)} title="Remover"><Trash2 size={16} /></button></div>
                  <p className="collection-name">{item.category || 'Colecionável'} · {item.collection}</p>
                  <h4>{item.title}</h4>
                  <div className="price">{currency.format(item.price || 0)}</div>
                  <div className="condition">{item.condition}</div>
                  <div className="date-line">Descoberto em {formatDate(item.discoveredAt || item.createdAt)} · verificado em {formatDate(item.lastCheckedAt || item.updatedAt)}</div>
                  {item.notes && <p className="notes">{item.notes}</p>}
                  <div className="card-actions">
                    <select className={`status status-${item.status.toLowerCase()}`} value={item.status} onChange={(event) => updateStatus(item.id, event.target.value)}>{statusOptions.map((status) => <option key={status}>{status}</option>)}</select>
                    {item.url && <a className="external-button" href={item.url} target="_blank" rel="noreferrer" title="Abrir anúncio"><ExternalLink size={17} /></a>}
                  </div>
                </article>
              ))}
              {!filteredItems.length && <div className="empty"><Radar size={30} /><p>Nenhum item apareceu neste setor da galáxia.</p></div>}
            </div>
          )}
        </section>
      </main>

      {showForm && (
        <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setShowForm(false)}>
          <form className="modal" onSubmit={addItem}>
            <div className="modal-title"><div><p className="eyebrow">NOVO SINAL</p><h3>Adicionar oportunidade</h3></div><button type="button" className="icon-button" onClick={() => setShowForm(false)}><X /></button></div>
            <label>Título<input name="title" required placeholder="Ex.: Omnibus Darth Vader" /></label>
            <div className="form-row"><label>Coleção<input name="collection" required placeholder="Panini — Darth Vader" /></label><label>Categoria<select name="category" defaultValue="HQ">{categoryOptions.map((category) => <option key={category}>{category}</option>)}</select></label></div>
            <label>Plataforma<input name="platform" required placeholder="Mercado Livre" /></label>
            <div className="form-row"><label>Preço (R$)<input name="price" type="number" min="0" step="0.01" required /></label><label>Status<select name="status" defaultValue="Avaliando">{statusOptions.map((status) => <option key={status}>{status}</option>)}</select></label></div>
            <label>Condição<input name="condition" required placeholder="Novo, lacrado, usado..." /></label>
            <label>Link do anúncio<input name="url" type="url" placeholder="https://..." /></label>
            <label>Notas<textarea name="notes" rows="3" placeholder="Detalhes da negociação, itens faltantes..." /></label>
            <div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setShowForm(false)}>Cancelar</button><button className="primary-button" disabled={saving}>{saving ? 'Salvando...' : 'Adicionar ao radar'}</button></div>
          </form>
        </div>
      )}
    </div>
  );
}

function Stat({ icon: Icon, label, value, accent = false }) {
  return <article className={`stat-card${accent ? ' accent' : ''}`}><div className="stat-icon"><Icon size={20} /></div><div><span>{label}</span><strong>{value}</strong></div></article>;
}

function formatDate(value) {
  const date = value?.toDate?.() || (value ? new Date(value) : null);
  return date && !Number.isNaN(date.getTime())
    ? new Intl.DateTimeFormat('pt-BR').format(date)
    : '—';
}

export default App;

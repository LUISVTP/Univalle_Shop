import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { api, money } from './api';
import type { Product, Profile, Order, Payment } from './api';
import { addToCart, cartTotal, load } from './cart';
import type { CartLine } from './cart';
import { ProductCard, ProfileForm, PublishForm } from './components';
type Receipt = { order: Order; payment?: Payment };
type Tab = 'catalog' | 'orders' | 'profile' | 'publish';
export default function App() {
  const [tab, setTab] = useState<Tab>('catalog');
  const [profile, setProfile] = useState<Profile | null>(() =>
    load('uv-profile', null),
  );
  const [cart, setCart] = useState<CartLine[]>(() => load('uv-cart', []));
  const [receipts, setReceipts] = useState<Receipt[]>(() =>
    load('uv-receipts', []),
  );
  const [products, setProducts] = useState<Product[]>([]);
  const [recommendations, setRecommendations] = useState<Product[]>([]);
  const [keywords, setKeywords] = useState('');
  const [query, setQuery] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [searchActive, setSearchActive] = useState(false);
  useEffect(() => {
    localStorage.setItem('uv-profile', JSON.stringify(profile));
  }, [profile]);
  useEffect(() => {
    localStorage.setItem('uv-cart', JSON.stringify(cart));
  }, [cart]);
  useEffect(() => {
    localStorage.setItem('uv-receipts', JSON.stringify(receipts));
  }, [receipts]);
  useEffect(() => {
    const c = new AbortController();
    void api<Product[]>('/products', undefined, c.signal)
      .then(setProducts)
      .catch((e) => {
        if (!c.signal.aborted) setError(e.message);
      })
      .finally(() => {
        if (!c.signal.aborted) setLoading(false);
      });
    return () => c.abort();
  }, []);
  useEffect(() => {
    setRecommendations([]);
    setKeywords('');
    if (!profile) return;
    const c = new AbortController();
    void api<{ items: Product[]; preferences: { keywords: string[] } }>(
      `/recommendations/${profile.id}`,
      undefined,
      c.signal,
    )
      .then((r) => {
        setRecommendations(r.items);
        setKeywords(r.preferences.keywords.join(', '));
      })
      .catch((e) => {
        if (!c.signal.aborted) setMessage(`Recomendaciones: ${e.message}`);
      });
    return () => c.abort();
  }, [profile]);
  async function refresh() {
    setLoading(true);
    setError('');
    try {
      setProducts(await api<Product[]>('/products'));
      setSearchActive(false);
      setQuery('');
      setMaxPrice('');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  async function search(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ q: query });
      if (maxPrice) params.set('maxPrice', maxPrice);
      const result = await api<{ items: Product[] }>(`/search?${params}`);
      setProducts(result.items);
      setSearchActive(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  function add(product: Product) {
    try {
      setCart(addToCart(cart, product));
      setMessage(`${product.name} agregado a tu carrito.`);
    } catch (e) {
      setMessage((e as Error).message);
    }
  }
  function remember(order: Order, payment?: Payment) {
    setReceipts((current) => [
      { order, payment },
      ...current.filter((r) => r.order.id !== order.id),
    ]);
  }
  async function checkout() {
    if (!profile) {
      setDrawer(false);
      setTab('profile');
      setMessage('Crea o recupera un perfil antes de continuar.');
      return;
    }
    setBusy(true);
    setMessage('');
    try {
      for (const line of cart) {
        const order = line.orderId
          ? (await api<{ data: Order }[]>(`/orders/${line.orderId}/events`)).at(
              -1,
            )!.data
          : await api<Order>('/orders', {
              userId: profile.id,
              productId: line.product.id,
              quantity: line.quantity,
            });
        // Guardar el ID antes de pagar permite reintentar sin crear otro pedido.
        setCart((current) => {
          const next = current.map((l) =>
            l.product.id === line.product.id ? { ...l, orderId: order.id } : l,
          );
          localStorage.setItem('uv-cart', JSON.stringify(next));
          return next;
        });
        remember(order);
        const payment = await api<Payment>('/payments', {
          orderId: order.id,
          idempotencyKey: `checkout_${order.id}`,
        });
        remember(order, payment);
        if (payment.status !== 'approved')
          throw new Error(
            'El simulador rechazó el pago. Consulta el comprobante en Mis pedidos.',
          );
        setCart((current) =>
          current.filter((l) => l.product.id !== line.product.id),
        );
      }
      setDrawer(false);
      setTab('orders');
      setMessage(
        'Compra de demostración terminada. No se realizó ningún cobro real.',
      );
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function consult(receipt: Receipt) {
    setBusy(true);
    try {
      const events = await api<{ data: Order }[]>(
        `/orders/${receipt.order.id}/events`,
      );
      remember(events.at(-1)!.data, receipt.payment);
      setMessage('Estado del pedido actualizado desde su historial.');
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function cancel(receipt: Receipt) {
    setBusy(true);
    try {
      const order = await api<Order>(`/orders/${receipt.order.id}/cancel`, {
        reason: 'Cancelado desde la interfaz de demostración',
      });
      remember(order, receipt.payment);
      setCart((c) => c.filter((l) => l.orderId !== order.id));
      setMessage('Pedido cancelado.');
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function saveInterests(event: FormEvent) {
    event.preventDefault();
    if (!profile) return;
    setBusy(true);
    try {
      await api(`/recommendations/${profile.id}/preferences`, {
        keywords: keywords
          .split(',')
          .map((k) => k.trim())
          .filter(Boolean),
      });
      const r = await api<{ items: Product[] }>(
        `/recommendations/${profile.id}`,
      );
      setRecommendations(r.items);
      setMessage(
        'Intereses guardados. Tus recomendaciones están actualizadas.',
      );
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const count = cart.reduce((sum, l) => sum + l.quantity, 0);
  return (
    <>
      <div className="top-strip">
        Hecho para nuestra comunidad · Proyecto académico de la Universidad del
        Valle
      </div>
      <header className="site-header">
        <button
          className="brand"
          onClick={() => setTab('catalog')}
          aria-label="UnivalleShop inicio"
        >
          <span className="brand-mark">
            U<span>v</span>
          </span>
          <span>
            Univalle<span className="brand-light">Shop</span>
            <small>EL MERCADO DE NUESTRA COMUNIDAD</small>
          </span>
        </button>
        <nav aria-label="Navegación principal">
          {(
            [
              ['catalog', 'Explorar'],
              ['orders', 'Mis pedidos'],
              ['profile', profile?.name.split(' ')[0] ?? 'Mi perfil'],
              ['publish', 'Publicar'],
            ] as [Tab, string][]
          ).map(([key, label]) => (
            <button
              key={key}
              className={tab === key ? 'active' : ''}
              onClick={() => setTab(key)}
            >
              {label}
            </button>
          ))}
        </nav>
        <button className="cart-button" onClick={() => setDrawer(true)}>
          Carrito <span>{count}</span>
        </button>
      </header>
      <main>
        {message && (
          <div className="feedback" role="status">
            <span>{message}</span>
            <button aria-label="Cerrar aviso" onClick={() => setMessage('')}>
              ×
            </button>
          </div>
        )}
        {tab === 'catalog' && (
          <>
            <section className="hero">
              <div>
                <span className="eyebrow">CERCA DE TI. ENTRE NOSOTROS.</span>
                <h1>
                  Tu comunidad.
                  <br />
                  Tu próximo hallazgo.
                </h1>
                <p>
                  Encuentra lo que necesitas y comparte lo que tienes.
                  <br />
                  El punto de encuentro para comprar en Univalle.
                </p>
                <a className="primary" href="#catalogo">
                  Explorar productos <span>↗</span>
                </a>
                <div className="hero-note">
                  <span className="tiny-dot" /> Una comunidad, muchas
                  posibilidades
                </div>
              </div>
              <div className="hero-visual" aria-hidden="true">
                <div className="orbit" />
                <div className="hero-card">
                  <span>UnivalleShop</span>
                  <svg viewBox="0 0 140 140" fill="none">
                    <path d="M35 50h70l8 70H27l8-70Z" fill="#fff7ed" />
                    <path
                      d="M50 53V38a20 20 0 0 1 40 0v15"
                      stroke="#fff7ed"
                      strokeWidth="7"
                    />
                    <path
                      d="m52 82 12 12 25-27"
                      stroke="#b82335"
                      strokeWidth="6"
                      strokeLinecap="round"
                    />
                  </svg>
                  <small>DE LA U, PARA TI.</small>
                </div>
                <span className="floating-tag tag-one">
                  ↗ Conexiones que suman
                </span>
                <span className="floating-tag tag-two">
                  ● Comunidad Univalle
                </span>
              </div>
            </section>
            <section id="catalogo" className="catalog-section">
              <div className="section-title">
                <div>
                  <span className="eyebrow">DESCUBRE EL MERCADO</span>
                  <h2>
                    {searchActive
                      ? 'Resultados de búsqueda'
                      : 'Encuentra tu próximo favorito'}
                  </h2>
                </div>
                <span className="count-label">{products.length} productos</span>
              </div>
              <form className="search-bar" onSubmit={search}>
                <label className="search-input">
                  <span aria-hidden="true">⌕</span>
                  <input
                    aria-label="Buscar productos"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="¿Qué estás buscando hoy?"
                    maxLength={100}
                  />
                </label>
                <label className="price-input">
                  <span>Hasta COP</span>
                  <input
                    aria-label="Precio máximo"
                    type="number"
                    min="0"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                    placeholder="Sin límite"
                  />
                </label>
                <button className="primary" disabled={loading}>
                  Buscar
                </button>
                {searchActive && (
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => void refresh()}
                  >
                    Ver todos
                  </button>
                )}
              </form>
              {loading ? (
                <div className="empty" role="status">
                  Buscando tus próximos hallazgos…
                </div>
              ) : error ? (
                <div className="empty error" role="alert">
                  <h3>No pudimos cargar el mercado</h3>
                  <p>{error}</p>
                  <button className="secondary" onClick={() => void refresh()}>
                    Reintentar
                  </button>
                </div>
              ) : products.length ? (
                <div className="product-grid">
                  {products.map((p) => (
                    <ProductCard key={p.id} product={p} onAdd={add} />
                  ))}
                </div>
              ) : (
                <div className="empty">
                  <h3>
                    {searchActive
                      ? 'No encontramos coincidencias'
                      : 'Nuestro mercado está por comenzar'}
                  </h3>
                  <p>
                    {searchActive
                      ? 'Prueba con otro nombre o un precio mayor.'
                      : 'Publica el primer producto para compartirlo con la comunidad.'}
                  </p>
                  {!searchActive && (
                    <button
                      className="primary"
                      onClick={() => setTab('publish')}
                    >
                      Publicar un producto
                    </button>
                  )}
                </div>
              )}
            </section>
            {recommendations.length > 0 && (
              <section>
                <div className="section-title">
                  <div>
                    <span className="eyebrow">UNA SELECCIÓN PARA TI</span>
                    <h2>Tal vez te gusten</h2>
                  </div>
                  <button
                    className="text-button"
                    onClick={() => setTab('profile')}
                  >
                    Editar intereses ↗
                  </button>
                </div>
                <div className="product-grid">
                  {recommendations.map((p) => (
                    <ProductCard key={p.id} product={p} onAdd={add} />
                  ))}
                </div>
              </section>
            )}
            <section className="community-banner">
              <span className="community-symbol">↗</span>
              <div>
                <h2>Lo mejor de la U es su gente.</h2>
                <p>
                  Un espacio para encontrarnos, compartir y hacer comunidad.
                </p>
              </div>
              <button className="secondary" onClick={() => setTab('profile')}>
                {profile ? 'Ver mi perfil' : 'Ser parte'}
              </button>
            </section>
          </>
        )}
        {tab === 'profile' && (
          <section>
            <span className="eyebrow">TU ESPACIO EN LA COMUNIDAD</span>
            <h1 className="page-title">Mi perfil</h1>
            {profile ? (
              <div className="form-columns">
                <div className="panel">
                  <div className="avatar">{profile.name.slice(0, 1)}</div>
                  <h2>{profile.name}</h2>
                  <p>{profile.email}</p>
                  <label>
                    ID de demostración
                    <input readOnly value={profile.id} />
                  </label>
                  <p className="notice">
                    Perfil de demostración, sin sesión autenticada. Guarda este
                    ID para recuperarlo.
                  </p>
                  <button
                    className="secondary"
                    disabled={busy}
                    onClick={() => {
                      setProfile(null);
                      setCart([]);
                      setReceipts([]);
                      setMessage('Perfil desvinculado de este navegador.');
                    }}
                  >
                    Cambiar de perfil
                  </button>
                </div>
                <form className="panel" onSubmit={saveInterests}>
                  <h3>¿Qué te interesa?</h3>
                  <p>
                    Personaliza las sugerencias con hasta 10 palabras o frases
                    separadas por comas.
                  </p>
                  <label>
                    Tus intereses
                    <input
                      value={keywords}
                      onChange={(e) => setKeywords(e.target.value)}
                      placeholder="cuaderno, café, cálculo"
                    />
                  </label>
                  <button className="primary" disabled={busy}>
                    Guardar intereses
                  </button>
                </form>
              </div>
            ) : (
              <ProfileForm onProfile={setProfile} report={setMessage} />
            )}
          </section>
        )}
        {tab === 'publish' && (
          <section>
            <span className="eyebrow">DALE UN LUGAR EN EL MERCADO</span>
            <h1 className="page-title">Publicar un producto</h1>
            <PublishForm
              report={setMessage}
              onPublished={() => {
                void refresh();
                setTab('catalog');
              }}
            />
          </section>
        )}
        {tab === 'orders' && (
          <section>
            <span className="eyebrow">TUS COMPRAS EN LA COMUNIDAD</span>
            <h1 className="page-title">Mis pedidos</h1>
            <p className="muted">
              Comprobantes de este navegador. Cada producto se procesa como un
              pedido independiente.
            </p>
            {receipts.length ? (
              <div className="receipt-list">
                {receipts.map((r) => (
                  <article key={r.order.id} className="panel receipt">
                    <div>
                      <span className="eyebrow">
                        {new Date(r.order.createdAt).toLocaleDateString(
                          'es-CO',
                        )}
                      </span>
                      <h3>{r.order.productName}</h3>
                      <p>
                        {r.order.quantity} unidades · {money(r.order.total)}
                      </p>
                      <small className="mono">Pedido: {r.order.id}</small>
                      {r.payment && (
                        <small className="mono">
                          Transacción: {r.payment.id}
                        </small>
                      )}
                    </div>
                    <div className="receipt-actions">
                      <span className="pill">
                        {r.order.status === 'cancelled'
                          ? 'Cancelado'
                          : r.payment?.status === 'approved'
                            ? 'Pago simulado aprobado'
                            : r.payment?.status === 'declined'
                              ? 'Pago simulado rechazado'
                              : 'Pendiente de pago'}
                      </span>
                      <button
                        className="secondary"
                        disabled={busy}
                        onClick={() => void consult(r)}
                      >
                        Consultar estado
                      </button>
                      {r.payment?.status !== 'approved' &&
                        r.order.status === 'created' && (
                          <button
                            className="text-button"
                            disabled={busy}
                            onClick={() => void cancel(r)}
                          >
                            Cancelar pedido
                          </button>
                        )}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty">
                <h3>Aún no hay pedidos en este navegador</h3>
                <p>Agrega un producto al carrito para comenzar.</p>
                <button className="primary" onClick={() => setTab('catalog')}>
                  Explorar productos
                </button>
              </div>
            )}
          </section>
        )}
      </main>
      <footer>
        <div className="footer-brand">
          UnivalleShop<span>De la U, para ti.</span>
        </div>
        <p>Proyecto académico · Desarrollo de Software 3</p>
        <small>Demostración: pagos simulados, sin cobros reales.</small>
      </footer>
      {drawer && (
        <div
          className="drawer-overlay"
          onClick={() => {
            if (!busy) setDrawer(false);
          }}
        >
          <aside
            className="cart-drawer"
            role="dialog"
            aria-modal="true"
            onKeyDown={(event) => {
              if (event.key === 'Escape' && !busy) setDrawer(false);
              if (event.key !== 'Tab') return;
              const controls =
                event.currentTarget.querySelectorAll<HTMLElement>(
                  'button:not([disabled]),input:not([disabled]),a[href]',
                );
              const first = controls[0];
              const last = controls[controls.length - 1];
              if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last?.focus();
              } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first?.focus();
              }
            }}
            aria-label="Tu carrito"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="section-title">
              <h2>
                Tu carrito <span className="muted">({count})</span>
              </h2>
              <button
                autoFocus
                className="close-button"
                disabled={busy}
                aria-label="Cerrar carrito"
                onClick={() => setDrawer(false)}
              >
                ×
              </button>
            </div>
            {cart.length ? (
              <>
                <div className="cart-lines">
                  {cart.map((line) => (
                    <article className="cart-line" key={line.product.id}>
                      <div>
                        <h3>{line.product.name}</h3>
                        <p>{money(line.product.price)} por unidad</p>
                        <label>
                          Cantidad{' '}
                          <input
                            aria-label={`Cantidad de ${line.product.name}`}
                            type="number"
                            min="1"
                            max={Math.min(line.product.stock, 100)}
                            value={line.quantity}
                            disabled={busy || !!line.orderId}
                            onChange={(e) => {
                              const n = Number(e.target.value);
                              if (
                                Number.isInteger(n) &&
                                n >= 1 &&
                                n <= Math.min(line.product.stock, 100)
                              )
                                setCart((c) =>
                                  c.map((l) =>
                                    l.product.id === line.product.id
                                      ? { ...l, quantity: n }
                                      : l,
                                  ),
                                );
                            }}
                          />
                        </label>
                        {line.orderId && (
                          <small>
                            Pedido creado; puedes reintentar el pago.
                          </small>
                        )}
                        <button
                          className="text-button"
                          disabled={busy || !!line.orderId}
                          onClick={() =>
                            setCart((c) =>
                              c.filter((l) => l.product.id !== line.product.id),
                            )
                          }
                        >
                          Quitar
                        </button>
                      </div>
                      <strong>
                        {money(line.product.price * line.quantity)}
                      </strong>
                    </article>
                  ))}
                </div>
                <div className="cart-total">
                  <span>Total estimado</span>
                  <strong>{money(cartTotal(cart))}</strong>
                </div>
                <p className="notice">
                  Pago de demostración. Sin tarjetas ni cobros reales. El precio
                  final se confirma con el catálogo al crear cada pedido.
                </p>
                {message && (
                  <p role="status" className="notice">
                    {message}
                  </p>
                )}
                <button
                  className="primary checkout"
                  disabled={busy}
                  onClick={() => void checkout()}
                >
                  {busy
                    ? 'Procesando pedidos…'
                    : profile
                      ? 'Confirmar compra simulada'
                      : 'Continuar con mi perfil'}
                </button>
              </>
            ) : (
              <div className="empty">
                <h3>Aquí empieza tu próximo hallazgo</h3>
                <p>Tu carrito está vacío.</p>
                <button
                  className="primary"
                  onClick={() => {
                    setDrawer(false);
                    setTab('catalog');
                  }}
                >
                  Explorar productos
                </button>
              </div>
            )}
          </aside>
        </div>
      )}
    </>
  );
}

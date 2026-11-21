import { useState } from 'react';
import type { FormEvent } from 'react';
import { api, money } from './api';
import type { Product, Profile } from './api';
export function ProductCard({
  product,
  onAdd,
}: {
  product: Product;
  onAdd: (p: Product) => void;
}) {
  const palette =
    ['rose', 'sage', 'sand', 'blue'][parseInt(product.id.slice(-2), 16) % 4] ??
    'rose';
  return (
    <article className="product-card">
      <div className={`product-art ${palette}`} aria-hidden="true">
        <svg viewBox="0 0 120 120" fill="none">
          <path d="M30 40h60l7 60H23l7-60Z" fill="currentColor" opacity=".25" />
          <path
            d="M43 44V33a17 17 0 0 1 34 0v11M30 40h60l7 60H23l7-60Z"
            stroke="currentColor"
            strokeWidth="4"
            strokeLinejoin="round"
          />
          <path
            d="m47 69 10 10 20-22"
            stroke="currentColor"
            strokeWidth="4"
            strokeLinecap="round"
          />
        </svg>
        <span className="stock-badge">
          {product.stock > 0 ? `${product.stock} disponibles` : 'Agotado'}
        </span>
      </div>
      <div className="product-info">
        <span className="eyebrow">COMUNIDAD UNIVALLE</span>
        <h3>{product.name}</h3>
        {product.reason && <p className="reason">{product.reason}</p>}
        <div className="product-bottom">
          <strong>{money(product.price)}</strong>
          <button
            aria-label={`Agregar ${product.name}`}
            className="add-button"
            disabled={!product.stock}
            onClick={() => onAdd(product)}
          >
            +
          </button>
        </div>
      </div>
    </article>
  );
}
export function ProfileForm({
  onProfile,
  report,
}: {
  onProfile: (p: Profile) => void;
  report: (m: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  async function register(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    const data = new FormData(event.currentTarget);
    try {
      const p = await api<Profile>('/users', {
        name: data.get('name'),
        email: data.get('email'),
        password: data.get('password'),
      });
      onProfile(p);
      report('Tu perfil de demostración fue creado.');
    } catch (error) {
      report((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function recover(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    try {
      const id = String(new FormData(event.currentTarget).get('id')).trim();
      onProfile(await api<Profile>(`/users/${encodeURIComponent(id)}`));
      report('Perfil recuperado para esta demostración.');
    } catch (error) {
      report((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="form-columns">
      <form onSubmit={register} className="panel">
        <h3>Crea tu perfil</h3>
        <p>Usa tu correo @correounivalle.edu.co.</p>
        <label>
          Nombre
          <input name="name" required maxLength={100} autoComplete="name" />
        </label>
        <label>
          Correo institucional
          <input name="email" type="email" required autoComplete="email" />
        </label>
        <label>
          Contraseña
          <input
            name="password"
            type="password"
            required
            minLength={12}
            maxLength={128}
            autoComplete="new-password"
          />
        </label>
        <small>Mínimo 12 caracteres. No se guarda en este navegador.</small>
        <button className="primary" disabled={busy}>
          {busy ? 'Procesando…' : 'Crear perfil'}
        </button>
      </form>
      <form onSubmit={recover} className="panel">
        <h3>¿Ya creaste un perfil?</h3>
        <p>
          Puedes recuperar el perfil con su identificador para continuar la
          demo.
        </p>
        <label>
          ID del usuario
          <input name="id" required pattern="[a-fA-F0-9]{24}" />
        </label>
        <button className="secondary" disabled={busy}>
          Recuperar perfil
        </button>
        <p className="notice">
          Esta versión no incluye inicio de sesión ni verificación del correo.
          Recuperar por ID no autentica al usuario.
        </p>
      </form>
    </div>
  );
}
export function PublishForm({
  onPublished,
  report,
}: {
  onPublished: () => void;
  report: (m: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    const form = event.currentTarget;
    const data = new FormData(form);
    try {
      await api('/products', {
        name: data.get('name'),
        price: Number(data.get('price')),
        stock: Number(data.get('stock')),
      });
      form.reset();
      onPublished();
      report(
        'Producto publicado. El índice de búsqueda se actualiza en hasta 30 segundos.',
      );
    } catch (error) {
      report((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="panel narrow" onSubmit={submit}>
      <h3>Comparte algo con la comunidad</h3>
      <p>Publicación de prueba: aún no hay permisos de vendedor.</p>
      <label>
        Nombre del producto
        <input
          name="name"
          required
          maxLength={150}
          placeholder="Ej. Cuaderno de cálculo"
        />
      </label>
      <div className="form-columns">
        <label>
          Precio en COP
          <input name="price" type="number" required min="1" step="1" />
        </label>
        <label>
          Unidades disponibles
          <input name="stock" type="number" required min="0" step="1" />
        </label>
      </div>
      <button className="primary" disabled={busy}>
        {busy ? 'Publicando…' : 'Publicar producto'}
      </button>
    </form>
  );
}

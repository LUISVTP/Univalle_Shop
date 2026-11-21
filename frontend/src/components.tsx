import { useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { api, money } from './api';
import type { Product, Profile } from './api';
import { catalogPhoto } from './catalogPhotos';
export type IconName =
  | 'search'
  | 'bag'
  | 'grid'
  | 'receipt'
  | 'user'
  | 'plus'
  | 'check'
  | 'arrow'
  | 'sparkles'
  | 'heart';
export function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, ReactNode> = {
    check: <path d="m5 12 4.5 4.5L19 7" />,
    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-4-4" />
      </>
    ),
    bag: (
      <>
        <path d="M5 8h14l1 12H4L5 8Z" />
        <path d="M9 8V6a3 3 0 0 1 6 0v2" />
      </>
    ),
    grid: (
      <>
        <rect x="4" y="4" width="6" height="6" rx="1.5" />
        <rect x="14" y="4" width="6" height="6" rx="1.5" />
        <rect x="4" y="14" width="6" height="6" rx="1.5" />
        <rect x="14" y="14" width="6" height="6" rx="1.5" />
      </>
    ),
    receipt: (
      <>
        <path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z" />
        <path d="M9 8h6M9 12h6" />
      </>
    ),
    user: (
      <>
        <circle cx="12" cy="8" r="3.5" />
        <path d="M5 20a7 7 0 0 1 14 0" />
      </>
    ),
    plus: (
      <>
        <path d="M12 5v14M5 12h14" />
      </>
    ),
    arrow: (
      <>
        <path d="M5 12h14M13 6l6 6-6 6" />
      </>
    ),
    sparkles: (
      <>
        <path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z" />
        <path d="m19 15 .8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15Z" />
      </>
    ),
    heart: (
      <path d="M20.8 8.8c0 4.2-8.8 10-8.8 10s-8.8-5.8-8.8-10A4.3 4.3 0 0 1 12 6a4.3 4.3 0 0 1 8.8 2.8Z" />
    ),
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}

export function ProductCard({
  product,
  onAdd,
  addedId,
}: {
  product: Product;
  onAdd: (p: Product, source: HTMLButtonElement) => void;
  addedId?: number;
}) {
  const photo = catalogPhoto(product.name);
  const preview = useRef<HTMLDialogElement>(null);
  return (
    <article className="product-card">
      {photo ? (
        <>
          <button
            type="button"
            className="product-art photo-trigger"
            aria-label={`Ampliar foto de ${product.name}`}
            onClick={() => preview.current?.showModal()}
          >
            <img src={photo.src} alt={photo.description} loading="lazy" />
            <span className="zoom-cue" aria-hidden="true">
              <Icon name="search" size={16} />
            </span>
          </button>
          <dialog
            className="photo-dialog"
            aria-label={`Foto de ${product.name}`}
            ref={preview}
            onClick={(event) => {
              if (event.target === event.currentTarget)
                preview.current?.close();
            }}
          >
            <div className="photo-view">
              <div className="photo-heading">
                <h3>{product.name}</h3>
                <form method="dialog">
                  <button aria-label="Cerrar foto" className="close-button">
                    ×
                  </button>
                </form>
              </div>
              <img src={photo.src} alt={photo.description} loading="lazy" />
              <small>Imagen de referencia</small>
            </div>
          </dialog>
        </>
      ) : (
        <div className="product-art no-photo">
          <Icon name="bag" size={32} />
          <span>Sin fotografía</span>
        </div>
      )}
      <div className="product-info">
        <span className="stock-badge">
          {product.stock > 0 ? `${product.stock} disponibles` : 'Agotado'}
        </span>
        <h3>{product.name}</h3>
        {product.reason && <p className="reason">{product.reason}</p>}
        <div className="product-bottom">
          <strong>{money(product.price)}</strong>
          <button
            aria-label={`Agregar ${product.name}`}
            className={addedId ? 'add-button is-added' : 'add-button'}
            disabled={!product.stock}
            onClick={(event) => onAdd(product, event.currentTarget)}
          >
            <span key={addedId ?? 'ready'}>
              <Icon name={addedId ? 'check' : 'plus'} size={18} />
            </span>
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

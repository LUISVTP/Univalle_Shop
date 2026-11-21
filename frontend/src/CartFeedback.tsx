import type { CSSProperties } from 'react';
import { Icon } from './components';
import { catalogPhoto } from './catalogPhotos';

type Flight = { x: number; y: number; dx: number; dy: number };
export type CartNotice =
  | {
      id: number;
      kind: 'added';
      productId: string;
      name: string;
      quantity: number;
      flight?: Flight;
    }
  | { id: number; kind: 'error'; message: string };

export function flightToCart(
  from: HTMLElement,
  to: HTMLElement | null,
): Flight | undefined {
  if (!to || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)
    return;
  const start = from.getBoundingClientRect();
  const end = to.getBoundingClientRect();
  const x = start.left + start.width / 2;
  const y = start.top + start.height / 2;
  return {
    x,
    y,
    dx: end.left + end.width / 2 - x,
    dy: end.top + end.height / 2 - y,
  };
}

export function CartFeedback({ notice }: { notice: CartNotice | null }) {
  const added = notice?.kind === 'added' ? notice : null;
  const photo = added && catalogPhoto(added.name);
  const flight = added?.flight;
  return (
    <>
      {flight && added && (
        <span
          key={added.id}
          aria-hidden="true"
          className="cart-flight"
          style={
            {
              left: flight.x,
              top: flight.y,
              '--dx': `${flight.dx}px`,
              '--dy': `${flight.dy}px`,
            } as CSSProperties
          }
        >
          {photo ? (
            <img src={photo.src} alt="" />
          ) : (
            <Icon name="bag" size={20} />
          )}
        </span>
      )}
      <div className="cart-announcer" role="status" aria-atomic="true">
        {notice && (
          <div className="cart-toast" key={notice.id}>
            <span className="toast-symbol" aria-hidden="true">
              {added ? <Icon name="check" /> : '!'}
            </span>
            <div>
              <strong>
                {added ? 'Añadido al carrito' : 'No se pudo añadir'}
              </strong>
              <span>
                {added
                  ? `${added.name} · En tu carrito: ${added.quantity}`
                  : notice.kind === 'error' && notice.message}
              </span>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

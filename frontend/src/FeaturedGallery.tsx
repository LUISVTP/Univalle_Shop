import { useRef, useState } from 'react';
import type { PointerEvent } from 'react';
import { catalogPhoto } from './catalogPhotos';
import { Icon } from './components';

const collection = [
  'Bolsa para el campus',
  'Cuaderno de cálculo',
  'Café del Valle',
].map((name) => ({ name, photo: catalogPhoto(name)! }));

export function FeaturedGallery() {
  const [index, setIndex] = useState(0);
  const gesture = useRef<{ x: number; y: number; pointer: number } | null>(
    null,
  );
  const step = (direction: number) =>
    setIndex(
      (current) =>
        (current + direction + collection.length) % collection.length,
    );

  function startGesture(event: PointerEvent<HTMLDivElement>) {
    if (!event.isPrimary || event.button !== 0) return;
    gesture.current = {
      x: event.clientX,
      y: event.clientY,
      pointer: event.pointerId,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function finishGesture(event: PointerEvent<HTMLDivElement>) {
    const start = gesture.current;
    if (!start || start.pointer !== event.pointerId) return;
    gesture.current = null;
    const dx = event.clientX - start.x;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(event.clientY - start.y))
      step(dx < 0 ? 1 : -1);
  }

  return (
    <figure
      className="hero-feature"
      aria-label="Galería de productos destacados"
      onKeyDown={(event) => {
        if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
          event.preventDefault();
          step(event.key === 'ArrowRight' ? 1 : -1);
        }
      }}
    >
      <div
        className="feature-stage"
        onPointerDown={startGesture}
        onPointerUp={finishGesture}
        onLostPointerCapture={() => {
          gesture.current = null;
        }}
      >
        {collection.map(({ name, photo }, position) => (
          <img
            key={name}
            src={photo.src}
            alt={photo.description}
            aria-hidden={position !== index}
            className={position === index ? 'is-current' : ''}
            fetchPriority={position === 0 ? 'high' : 'auto'}
            draggable={false}
          />
        ))}
      </div>
      <figcaption>
        <div className="feature-caption">
          <div className="feature-progress" aria-hidden="true">
            {collection.map(({ name }, position) => (
              <i
                key={name}
                className={position === index ? 'is-current' : ''}
              />
            ))}
          </div>
          <span aria-live="polite" aria-atomic="true">
            <strong key={index}>{collection[index].name}</strong>
          </span>
        </div>
        <div className="feature-controls">
          <button
            type="button"
            className="feature-prev"
            aria-label="Producto destacado anterior"
            onClick={() => step(-1)}
          >
            <Icon name="arrow" size={18} />
          </button>
          <button
            type="button"
            aria-label="Producto destacado siguiente"
            onClick={() => step(1)}
          >
            <Icon name="arrow" size={18} />
          </button>
        </div>
      </figcaption>
    </figure>
  );
}

export type CatalogPhoto = { src: string; description: string };

// The API has no photo field. Only associate reference photos with known
// catalogue names so that new listings never inherit another item's picture.
const photos: Record<string, CatalogPhoto> = {
  'bolsa para el campus': {
    src: '/catalogo/bolsa-campus.jpg',
    description: 'Bolsa de lona con el símbolo de Univalle en el frente',
  },
  'cuaderno de calculo': {
    src: '/catalogo/cuaderno-calculo.jpg',
    description:
      'Cuaderno de cálculo con cubierta roja y el símbolo de Univalle',
  },
  'cuaderno cuadriculado': {
    src: '/catalogo/cuaderno-cuadriculado.jpg',
    description: 'Cuaderno Univalle abierto sobre sus hojas cuadriculadas',
  },
  'cafe del valle': {
    src: '/catalogo/cafe-valle.jpg',
    description: 'Empaque de Café del Valle acompañado de granos tostados',
  },
  'cafe agotado': {
    src: '/catalogo/cafe-tinto.jpg',
    description: 'Café servido en una taza roja sobre su plato',
  },
  'libro de programacion': {
    src: '/catalogo/libro-programacion.jpg',
    description: 'Libro de programación de tapa negra',
  },
  'kit de dibujo': {
    src: '/catalogo/kit-dibujo.jpg',
    description: 'Estuche con lápices de grafito y accesorios de dibujo',
  },
  'agenda universitaria': {
    src: '/catalogo/agenda.jpg',
    description: 'Agenda semanal abierta con un marcador de cinta roja',
  },
};

export function catalogPhoto(name: string): CatalogPhoto | undefined {
  const key = name
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
  return Object.hasOwn(photos, key) ? photos[key] : undefined;
}

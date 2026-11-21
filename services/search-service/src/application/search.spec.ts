import { SearchProducts } from './search.js';
describe('búsqueda e índice independiente', () => {
  const catalog = {
    list: vi
      .fn()
      .mockResolvedValue([
        { id: 'a', name: 'Cálculo', price: 10000, stock: 2 },
      ]),
  };
  const index = {
    upsert: vi.fn().mockResolvedValue(undefined),
    query: vi.fn().mockResolvedValue([]),
  };
  beforeEach(() => vi.clearAllMocks());
  it('normaliza acentos y aplica el filtro de precio', async () => {
    await new SearchProducts(catalog, index, () => 100000).execute({
      q: ' CÁLCULO  libro ',
      maxPrice: '20000',
    });
    expect(index.query).toHaveBeenCalledWith(['calculo', 'libro'], 20000);
    expect(index.upsert).toHaveBeenCalled();
  });
  it('reutiliza el índice durante treinta segundos y luego lo actualiza', async () => {
    let time = 100000;
    const search = new SearchProducts(catalog, index, () => time);
    await search.execute({});
    await search.execute({ q: 'café' });
    expect(catalog.list).toHaveBeenCalledTimes(1);
    time += 30000;
    await search.execute({});
    expect(catalog.list).toHaveBeenCalledTimes(2);
  });
  it('rechaza filtros inválidos sin consultar dependencias', async () => {
    const search = new SearchProducts(catalog, index, () => 100000);
    await expect(search.execute({ maxPrice: 'abc' })).rejects.toMatchObject({
      code: 'invalid',
    });
    await expect(search.execute({ maxPrice: '' })).rejects.toMatchObject({
      code: 'invalid',
    });
    await expect(search.execute({ q: 'a'.repeat(101) })).rejects.toMatchObject({
      code: 'invalid',
    });
    expect(catalog.list).not.toHaveBeenCalled();
  });
  it('propaga los fallos de sincronización y permite reintentar', async () => {
    catalog.list.mockRejectedValueOnce(new Error('offline'));
    const search = new SearchProducts(catalog, index, () => 100000);
    await expect(search.execute({})).rejects.toThrow('offline');
    await search.execute({});
    expect(catalog.list).toHaveBeenCalledTimes(2);
  });
});

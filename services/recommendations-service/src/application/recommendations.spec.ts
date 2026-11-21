import { RecommendProducts, SavePreferences } from './recommendations.js';
const userId = 'a'.repeat(24);
describe('recomendaciones por preferencias', () => {
  const repository = {
    find: vi.fn(),
    save: vi.fn().mockResolvedValue(undefined),
  };
  const users = { exists: vi.fn().mockResolvedValue(undefined) };
  const catalog = {
    list: vi.fn().mockResolvedValue([
      { id: '1', name: 'Cuaderno', price: 1000, stock: 1 },
      { id: '2', name: 'Café del Valle', price: 2000, stock: 1 },
      { id: '3', name: 'Café agotado', price: 500, stock: 0 },
    ]),
  };
  beforeEach(() => {
    vi.clearAllMocks();
    repository.find.mockResolvedValue(null);
  });
  it('guarda intereses normalizados sin duplicados', async () => {
    expect(
      await new SavePreferences(repository, users).execute(userId, {
        keywords: [' Café ', 'cafe'],
      }),
    ).toEqual({ userId, keywords: ['cafe'] });
    expect(users.exists).toHaveBeenCalledWith(userId);
  });
  it('prioriza coincidencias y excluye productos agotados', async () => {
    repository.find.mockResolvedValue({ userId, keywords: ['cafe'] });
    const result = await new RecommendProducts(
      repository,
      catalog,
      users,
    ).execute(userId);
    expect(result.items.map((p) => p.id)).toEqual(['2', '1']);
    expect(result.items[0].reason).toContain('cafe');
  });
  it('sin intereses usa productos disponibles ordenados por precio', async () => {
    const result = await new RecommendProducts(
      repository,
      catalog,
      users,
    ).execute(userId);
    expect(result.strategy).toBe('available-products');
    expect(result.items[0].id).toBe('1');
  });
  it('valida el usuario y los intereses antes de guardar', async () => {
    const save = new SavePreferences(repository, users);
    await expect(save.execute('bad', { keywords: [] })).rejects.toMatchObject({
      code: 'invalid',
    });
    await expect(
      save.execute(userId, { keywords: ['x'] }),
    ).rejects.toMatchObject({ code: 'invalid' });
    expect(repository.save).not.toHaveBeenCalled();
  });
});

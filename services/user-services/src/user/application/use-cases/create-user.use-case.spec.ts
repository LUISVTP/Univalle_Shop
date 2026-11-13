import { CreateUserUseCase } from './create-user.use-case.js';
import { InvalidUser } from '../../domain/errors.js';
import { ScryptPasswordHasher } from '../../infrastructure/adapter/scrypt-password-hasher.js';

describe('CreateUserUseCase', () => {
  const save = vi.fn(async (user) => user);
  const hash = vi.fn(async () => 'hashed');
  const useCase = new CreateUserUseCase(
    { SaveUser: save },
    { hash },
    'correounivalle.edu.co',
  );
  beforeEach(() => vi.clearAllMocks());
  it('normaliza datos y persiste solamente el hash', async () => {
    const user = await useCase.execute({
      name: ' Ana ',
      email: ' ANA@correounivalle.edu.co ',
      password: 'ClaveLarga123!',
    });
    expect(user.name).toBe('Ana');
    expect(user.email).toBe('ana@correounivalle.edu.co');
    expect(user.passwordHash).toBe('hashed');
    expect(save).toHaveBeenCalledWith(user);
    expect(hash).toHaveBeenCalledWith('ClaveLarga123!');
  });
  it.each([
    {
      name: '',
      email: 'ana@correounivalle.edu.co',
      password: 'ClaveLarga123!',
    },
    { name: 'Ana', email: 'ana@gmail.com', password: 'ClaveLarga123!' },
    {
      name: 'Ana',
      email: 'ana@evilcorreounivalle.edu.co',
      password: 'ClaveLarga123!',
    },
    { name: 'Ana', email: 'ana@correounivalle.edu.co', password: 'corta' },
  ])('rechaza entradas inválidas sin persistir', async (input) => {
    await expect(useCase.execute(input)).rejects.toBeInstanceOf(InvalidUser);
    expect(save).not.toHaveBeenCalled();
    expect(hash).not.toHaveBeenCalled();
  });
  it('propaga errores de persistencia', async () => {
    save.mockRejectedValueOnce(new Error('Database unavailable'));
    await expect(
      useCase.execute({
        name: 'Ana',
        email: 'ana@correounivalle.edu.co',
        password: 'ClaveLarga123!',
      }),
    ).rejects.toThrow('Database unavailable');
  });
  it('scrypt produce hashes distintos por su sal aleatoria', async () => {
    const hasher = new ScryptPasswordHasher();
    const first = await hasher.hash('ClaveLarga123!');
    expect(first.split('$').map((part) => part.length)).toEqual([6, 32, 128]);
    expect(await hasher.hash('ClaveLarga123!')).not.toBe(first);
  });
});

import { OrderFacts } from '../domain/ports.js';
import { DependencyUnavailable, ReferenceNotFound } from '../domain/order.js';
export class HttpOrderFacts extends OrderFacts {
  constructor(
    private readonly usersUrl: string,
    private readonly catalogUrl: string,
  ) {
    super();
  }
  private async get(url: string): Promise<unknown> {
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(3000),
        redirect: 'error',
      });
      if (response.status === 404 || response.status === 400)
        throw new ReferenceNotFound('Usuario o producto no encontrado');
      if (!response.ok)
        throw new DependencyUnavailable('Servicio de referencia no disponible');
      return await response.json();
    } catch (error) {
      if (
        error instanceof ReferenceNotFound ||
        error instanceof DependencyUnavailable
      )
        throw error;
      throw new DependencyUnavailable(
        'No fue posible consultar usuarios o catálogo',
      );
    }
  }
  async userExists(id: string) {
    await this.get(
      new URL(`/users/${encodeURIComponent(id)}`, this.usersUrl).href,
    );
  }
  async product(id: string) {
    const result = (await this.get(
      new URL(`/products/${encodeURIComponent(id)}`, this.catalogUrl).href,
    )) as Record<string, unknown>;
    if (
      result.id !== id ||
      typeof result.name !== 'string' ||
      typeof result.price !== 'number' ||
      !Number.isFinite(result.price) ||
      result.price <= 0 ||
      !Number.isSafeInteger(result.stock) ||
      Number(result.stock) < 0
    ) {
      throw new DependencyUnavailable('Respuesta de catálogo inválida');
    }
    return result as unknown as {
      id: string;
      name: string;
      price: number;
      stock: number;
    };
  }
}

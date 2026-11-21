import { DomainError } from '../domain/errors.js';
export async function getJson(base: string, path: string): Promise<unknown> {
  try {
    const response = await fetch(new URL(path, base), {
      signal: AbortSignal.timeout(2500),
      redirect: 'error',
    });
    if (response.status === 404)
      throw new DomainError('missing', 'Recurso relacionado no encontrado');
    if (!response.ok)
      throw new DomainError('upstream', 'Servicio relacionado no disponible');
    return await response.json();
  } catch (error) {
    if (error instanceof DomainError) throw error;
    throw new DomainError(
      'upstream',
      'No se pudo consultar el servicio relacionado',
    );
  }
}

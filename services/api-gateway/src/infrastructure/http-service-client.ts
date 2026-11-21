import {
  ServiceClient,
  ServiceTimeout,
  ServiceUnavailable,
} from '../domain/service-client.js';
import type { Service, ServiceResponse } from '../domain/service-client.js';

export class HttpServiceClient extends ServiceClient {
  constructor(
    private readonly urls: Partial<Record<Service, string>>,
    private readonly timeoutMs = 3000,
  ) {
    super();
  }
  async request(
    service: Service,
    method: 'GET' | 'POST',
    path: string,
    body?: unknown,
  ): Promise<ServiceResponse> {
    try {
      const url = new URL(path, this.urls[service]);
      const options = {
        signal: AbortSignal.timeout(this.timeoutMs),
        redirect: 'error' as const,
      };
      const response =
        method === 'GET'
          ? await fetch(url, options)
          : await fetch(url, {
              ...options,
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify(body),
            });
      const text = await response.text();
      return { status: response.status, body: text ? JSON.parse(text) : null };
    } catch (error) {
      if (error instanceof Error && error.name === 'TimeoutError')
        throw new ServiceTimeout('Servicio sin respuesta');
      throw new ServiceUnavailable('Servicio no disponible');
    }
  }
}

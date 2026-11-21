export type Service = 'users' | 'catalog' | 'orders';
export interface ServiceResponse {
  status: number;
  body: unknown;
}
export class ServiceUnavailable extends Error {}
export class ServiceTimeout extends Error {}
export abstract class ServiceClient {
  abstract request(
    service: Service,
    method: 'GET' | 'POST',
    path: string,
    body?: unknown,
  ): Promise<ServiceResponse>;
}

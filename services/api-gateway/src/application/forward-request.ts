import { ServiceClient } from "../domain/service-client.js";
import type { Service } from "../domain/service-client.js";
export class ForwardRequest {
  constructor(private readonly client: ServiceClient) {}
  execute(
    service: Service,
    method: "GET" | "POST",
    path: string,
    body?: unknown,
  ) {
    return this.client.request(service, method, path, body);
  }
}

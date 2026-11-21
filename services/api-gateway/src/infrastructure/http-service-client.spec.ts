import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { HttpServiceClient } from "./http-service-client.js";
import { ForwardRequest } from "../application/forward-request.js";
import {
  ServiceTimeout,
  ServiceUnavailable,
} from "../domain/service-client.js";

describe("Gateway HTTP adapter", () => {
  const server = createServer((req, res) => {
    if (req.url === "/slow") return;
    res.writeHead(409, { "content-type": "application/json" });
    res.end(JSON.stringify({ message: "Duplicado" }));
  });
  let url: string;
  beforeAll(async () => {
    await new Promise<void>((resolve) =>
      server.listen(0, "127.0.0.1", resolve),
    );
    url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });
  afterAll(async () => {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  });
  it("conserva estado y cuerpo del servicio", async () => {
    const forward = new ForwardRequest(
      new HttpServiceClient({ users: url, catalog: url }),
    );
    expect(await forward.execute("users", "POST", "/users", {})).toEqual({
      status: 409,
      body: { message: "Duplicado" },
    });
  });
  it("limita el tiempo de espera", async () => {
    const client = new HttpServiceClient({ users: url, catalog: url }, 40);
    await expect(
      client.request("catalog", "GET", "/slow"),
    ).rejects.toBeInstanceOf(ServiceTimeout);
  });
  it("traduce fallos de conexión", async () => {
    const client = new HttpServiceClient({
      users: "http://127.0.0.1:1",
      catalog: url,
    });
    await expect(
      client.request("users", "GET", "/health"),
    ).rejects.toBeInstanceOf(ServiceUnavailable);
  });
});

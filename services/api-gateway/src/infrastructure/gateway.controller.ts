import { Body, Controller, Get, Inject, Post, Res } from "@nestjs/common";
import type { Response } from "express";
import { ForwardRequest } from "../application/forward-request.js";
import {
  ServiceTimeout,
  ServiceUnavailable,
} from "../domain/service-client.js";
import type { Service } from "../domain/service-client.js";

@Controller()
export class GatewayController {
  constructor(
    @Inject(ForwardRequest) private readonly forward: ForwardRequest,
  ) {}
  @Get("health") health() {
    return { status: "ok" };
  }
  @Post("api/users") createUser(@Body() body: unknown, @Res() res: Response) {
    return this.send("users", "POST", "/users", res, body);
  }
  @Post("api/products") createProduct(
    @Body() body: unknown,
    @Res() res: Response,
  ) {
    return this.send("catalog", "POST", "/products", res, body);
  }
  @Get("api/products") listProducts(@Res() res: Response) {
    return this.send("catalog", "GET", "/products", res);
  }
  private async send(
    service: Service,
    method: "GET" | "POST",
    path: string,
    res: Response,
    body?: unknown,
  ) {
    try {
      const result = await this.forward.execute(service, method, path, body);
      return res.status(result.status).json(result.body);
    } catch (error) {
      if (!(
        error instanceof ServiceTimeout || error instanceof ServiceUnavailable
      ))
        throw error;
      const status = error instanceof ServiceTimeout ? 504 : 502;
      return res
        .status(status)
        .json({ statusCode: status, message: error.message });
    }
  }
}

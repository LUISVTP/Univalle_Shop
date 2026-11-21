import { Controller, Get, ServiceUnavailableException } from "@nestjs/common";
import { InjectConnection } from "@nestjs/mongoose";
import type { Connection } from "mongoose";
@Controller("health")
export class HealthController {
  constructor(@InjectConnection() private readonly connection: Connection) {}
  @Get() async health() {
    try {
      if (!this.connection.db) throw new Error("Disconnected");
      await this.connection.db.admin().ping();
      return { status: "ok" };
    } catch {
      throw new ServiceUnavailableException("Database unavailable");
    }
  }
}

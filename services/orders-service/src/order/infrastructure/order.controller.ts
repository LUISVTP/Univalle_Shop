import {
  ArgumentsHost,
  Body,
  Catch,
  Controller,
  Get,
  HttpCode,
  Inject,
  Param,
  Post,
} from '@nestjs/common';
import type { ExceptionFilter } from '@nestjs/common';
import type { Response } from 'express';
import {
  CancelOrder,
  CreateOrder,
  GetOrder,
  GetOrderEvents,
  RebuildOrder,
} from '../application/orders.js';
import type { CreateOrderInput } from '../application/orders.js';
import {
  DependencyUnavailable,
  InvalidOrder,
  OrderConflict,
  OrderNotFound,
  ReferenceNotFound,
} from '../domain/order.js';
@Controller('orders')
export class OrderController {
  constructor(
    @Inject(CreateOrder) private readonly createOrder: CreateOrder,
    @Inject(CancelOrder) private readonly cancelOrder: CancelOrder,
    @Inject(GetOrder) private readonly getOrder: GetOrder,
    @Inject(GetOrderEvents) private readonly getEvents: GetOrderEvents,
    @Inject(RebuildOrder) private readonly rebuildOrder: RebuildOrder,
  ) {}
  @Post() @HttpCode(202) create(@Body() input: CreateOrderInput) {
    return this.createOrder.execute(input);
  }
  @Post(':id/cancel') @HttpCode(202) cancel(
    @Param('id') id: string,
    @Body() input: { reason: string },
  ) {
    return this.cancelOrder.execute(id, input);
  }
  @Get(':id') get(@Param('id') id: string) {
    return this.getOrder.execute(id);
  }
  @Get(':id/events') events(@Param('id') id: string) {
    return this.getEvents.execute(id);
  }
  @Post(':id/rebuild') @HttpCode(200) rebuild(@Param('id') id: string) {
    return this.rebuildOrder.execute(id);
  }
}
@Catch(
  DependencyUnavailable,
  InvalidOrder,
  OrderConflict,
  OrderNotFound,
  ReferenceNotFound,
)
export class OrderErrorFilter implements ExceptionFilter {
  catch(error: Error, host: ArgumentsHost) {
    const status =
      error instanceof InvalidOrder
        ? 400
        : error instanceof OrderConflict
          ? 409
          : error instanceof DependencyUnavailable
            ? 502
            : 404;
    host
      .switchToHttp()
      .getResponse<Response>()
      .status(status)
      .json({ statusCode: status, message: error.message });
  }
}

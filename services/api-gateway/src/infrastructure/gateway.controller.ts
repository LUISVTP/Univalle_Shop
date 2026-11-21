import {
  Body,
  Controller,
  Get,
  Inject,
  Post,
  Param,
  Query,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { AggregateOrder } from '../application/aggregate-order.js';
import { ForwardRequest } from '../application/forward-request.js';
import {
  ServiceTimeout,
  ServiceUnavailable,
} from '../domain/service-client.js';
import type { Service } from '../domain/service-client.js';

@Controller()
export class GatewayController {
  constructor(
    @Inject(ForwardRequest) private readonly forward: ForwardRequest,
    @Inject(AggregateOrder) private readonly aggregate: AggregateOrder,
  ) {}
  @Get('health') health() {
    return { status: 'ok' };
  }
  @Post('api/users') createUser(@Body() body: unknown, @Res() res: Response) {
    return this.send('users', 'POST', '/users', res, body);
  }
  @Post('api/products') createProduct(
    @Body() body: unknown,
    @Res() res: Response,
  ) {
    return this.send('catalog', 'POST', '/products', res, body);
  }
  @Get('api/products') listProducts(@Res() res: Response) {
    return this.send('catalog', 'GET', '/products', res);
  }
  @Get('api/users/:id') user(@Param('id') id: string, @Res() res: Response) {
    return this.send('users', 'GET', `/users/${encodeURIComponent(id)}`, res);
  }
  @Get('api/products/:id') product(
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    return this.send(
      'catalog',
      'GET',
      `/products/${encodeURIComponent(id)}`,
      res,
    );
  }
  @Get('api/products/:id/activity') activity(
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    return this.send(
      'catalog',
      'GET',
      `/products/${encodeURIComponent(id)}/activity`,
      res,
    );
  }
  @Post('api/orders') createOrder(@Body() body: unknown, @Res() res: Response) {
    return this.send('orders', 'POST', '/orders', res, body);
  }
  @Get('api/orders/:id') order(@Param('id') id: string, @Res() res: Response) {
    return this.send('orders', 'GET', `/orders/${encodeURIComponent(id)}`, res);
  }
  @Get('api/orders/:id/events') events(
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    return this.send(
      'orders',
      'GET',
      `/orders/${encodeURIComponent(id)}/events`,
      res,
    );
  }
  @Post('api/orders/:id/cancel') cancel(
    @Param('id') id: string,
    @Body() body: unknown,
    @Res() res: Response,
  ) {
    return this.send(
      'orders',
      'POST',
      `/orders/${encodeURIComponent(id)}/cancel`,
      res,
      body,
    );
  }
  @Post('api/orders/:id/rebuild') rebuild(
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    return this.send(
      'orders',
      'POST',
      `/orders/${encodeURIComponent(id)}/rebuild`,
      res,
      {},
    );
  }
  @Get('api/orders/:id/summary') async summary(
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    try {
      const result = await this.aggregate.execute(id);
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

  @Post('api/payments') pay(@Body() body: unknown, @Res() res: Response) {
    return this.send('payments', 'POST', '/payments', res, body);
  }
  @Get('api/payments/:id') payment(
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    return this.send(
      'payments',
      'GET',
      `/payments/${encodeURIComponent(id)}`,
      res,
    );
  }
  @Get('api/search') search(
    @Query('q') q: string | undefined,
    @Query('maxPrice') maxPrice: string | undefined,
    @Res() res: Response,
  ) {
    if (
      (q !== undefined && typeof q !== 'string') ||
      (maxPrice !== undefined && typeof maxPrice !== 'string')
    )
      return res
        .status(400)
        .json({ message: 'Parámetros de búsqueda inválidos' });
    const params = new URLSearchParams();
    if (q !== undefined) params.set('q', q);
    if (maxPrice !== undefined) params.set('maxPrice', maxPrice);
    return this.send('search', 'GET', `/search?${params}`, res);
  }
  @Get('api/recommendations/:userId') recommendations(
    @Param('userId') id: string,
    @Res() res: Response,
  ) {
    return this.send(
      'recommendations',
      'GET',
      `/recommendations/${encodeURIComponent(id)}`,
      res,
    );
  }
  @Post('api/recommendations/:userId/preferences') preferences(
    @Param('userId') id: string,
    @Body() body: unknown,
    @Res() res: Response,
  ) {
    return this.send(
      'recommendations',
      'POST',
      `/recommendations/${encodeURIComponent(id)}/preferences`,
      res,
      body,
    );
  }
  private async send(
    service: Service,
    method: 'GET' | 'POST',
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

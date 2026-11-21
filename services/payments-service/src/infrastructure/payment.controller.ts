import { Body, Controller, Get, Inject, Param, Post } from '@nestjs/common';
import { CreatePayment, GetPayment } from '../application/payments.js';
@Controller('payments')
export class PaymentController {
  constructor(
    @Inject(CreatePayment) private readonly create: CreatePayment,
    @Inject(GetPayment) private readonly get: GetPayment,
  ) {}
  @Post() pay(@Body() body: { orderId: string; idempotencyKey: string }) {
    return this.create.execute(body);
  }
  @Get(':id') find(@Param('id') id: string) {
    return this.get.execute(id);
  }
}

import { Controller, Get, Inject, Param } from '@nestjs/common';
import { GetProduct } from '../application/get-product.js';
@Controller('products')
export class ProductQueryController {
  constructor(@Inject(GetProduct) private readonly getProduct: GetProduct) {}
  @Get(':id') get(@Param('id') id: string) {
    return this.getProduct.execute(id);
  }
}

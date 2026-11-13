import {
  ArgumentsHost,
  Body,
  Catch,
  Controller,
  Get,
  Inject,
  Post,
} from "@nestjs/common";
import type { ExceptionFilter } from "@nestjs/common";
import type { Response } from "express";
import { CreateProduct, ListProducts } from "../application/catalog.js";
import { InvalidProduct } from "../domain/product.js";
import type { Product } from "../domain/product.js";

@Controller("products")
export class ProductController {
  constructor(
    @Inject(CreateProduct) private readonly createProduct: CreateProduct,
    @Inject(ListProducts) private readonly listProducts: ListProducts,
  ) {}
  @Post() create(@Body() input: Omit<Product, "id">) {
    return this.createProduct.execute(input);
  }
  @Get() list() {
    return this.listProducts.execute();
  }
}
@Catch(InvalidProduct)
export class ProductErrorFilter implements ExceptionFilter {
  catch(error: InvalidProduct, host: ArgumentsHost) {
    host
      .switchToHttp()
      .getResponse<Response>()
      .status(400)
      .json({ statusCode: 400, message: error.message });
  }
}

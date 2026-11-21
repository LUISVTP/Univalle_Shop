import { Controller, Get, Inject, Query } from '@nestjs/common';
import { SearchProducts } from '../application/search.js';
@Controller('search')
export class SearchController {
  constructor(
    @Inject(SearchProducts) private readonly search: SearchProducts,
  ) {}
  @Get() find(@Query('q') q?: string, @Query('maxPrice') maxPrice?: string) {
    return this.search.execute({ q, maxPrice });
  }
}

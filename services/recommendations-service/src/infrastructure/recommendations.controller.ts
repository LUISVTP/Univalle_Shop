import { Body, Controller, Get, Inject, Param, Post } from '@nestjs/common';
import {
  RecommendProducts,
  SavePreferences,
} from '../application/recommendations.js';
@Controller('recommendations')
export class RecommendationsController {
  constructor(
    @Inject(RecommendProducts) private readonly recommend: RecommendProducts,
    @Inject(SavePreferences) private readonly save: SavePreferences,
  ) {}
  @Get(':userId') list(@Param('userId') id: string) {
    return this.recommend.execute(id);
  }
  @Post(':userId/preferences') preferences(
    @Param('userId') id: string,
    @Body() body: { keywords: string[] },
  ) {
    return this.save.execute(id, body);
  }
}

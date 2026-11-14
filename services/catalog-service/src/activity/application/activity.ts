import { ActivityRepository } from '../domain/activity.js';
import type { OrderActivity } from '../domain/activity.js';
export class RecordOrderActivity {
  constructor(private readonly repository: ActivityRepository) {}
  execute(activity: OrderActivity) {
    return this.repository.apply(activity);
  }
}
export class GetProductActivity {
  constructor(private readonly repository: ActivityRepository) {}
  async execute(productId: string) {
    const rows = await this.repository.forProduct(productId);
    return {
      productId,
      createdOrders: rows.length,
      activeQuantity: rows
        .filter((row) => row.status === 'created')
        .reduce((sum, row) => sum + row.quantity, 0),
      cancelledOrders: rows.filter((row) => row.status === 'cancelled').length,
    };
  }
}

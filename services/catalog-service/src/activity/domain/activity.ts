export interface OrderActivity {
  orderId: string;
  productId: string;
  quantity: number;
  status: 'created' | 'cancelled';
  version: number;
}
export abstract class ActivityRepository {
  abstract apply(activity: OrderActivity): Promise<void>;
  abstract forProduct(productId: string): Promise<OrderActivity[]>;
}

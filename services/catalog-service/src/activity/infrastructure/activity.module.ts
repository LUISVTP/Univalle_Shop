import {
  Controller,
  Get,
  Inject,
  Injectable,
  Logger,
  Module,
  Param,
} from '@nestjs/common';
import type { OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import type { Connection } from 'mongoose';
import type { mongo } from 'mongoose';
import { ActivityRepository } from '../domain/activity.js';
import type { OrderActivity } from '../domain/activity.js';
import {
  GetProductActivity,
  RecordOrderActivity,
} from '../application/activity.js';
import { BrokerTransport } from '../../messaging/broker-transport.js';
import { parseOrderEvent } from '../../messaging/order-event.contract.js';
interface Record extends OrderActivity {
  _id: string;
}
@Injectable()
class MongoActivityRepository extends ActivityRepository {
  private readonly collection: mongo.Collection<Record>;
  constructor(@InjectConnection() connection: Connection) {
    super();
    this.collection = connection.db!.collection<Record>('order_activity');
  }
  async apply(activity: OrderActivity) {
    try {
      // El snapshot de cada evento permite aplicar versiÃ³n 2 aunque 1 aÃºn no haya llegado.
      await this.collection.updateOne(
        { _id: activity.orderId, version: { $lt: activity.version } },
        { $set: activity },
        { upsert: true },
      );
    } catch (error) {
      if (!(
        error &&
        typeof error === 'object' &&
        'code' in error &&
        error.code === 11000
      ))
        throw error;
      const current = await this.collection.findOne({ _id: activity.orderId });
      if (!current || current.version < activity.version) throw error;
    }
  }
  async forProduct(productId: string) {
    return this.collection.find({ productId }).toArray();
  }
}
@Injectable()
class ActivityConsumer implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ActivityConsumer.name);
  private timer?: ReturnType<typeof setInterval>;
  private busy = false;
  private stopped = false;
  private inFlight: Promise<void> = Promise.resolve();
  constructor(
    @Inject(BrokerTransport) private readonly bus: BrokerTransport,
    @Inject(RecordOrderActivity) private readonly record: RecordOrderActivity,
  ) {}
  onModuleInit() {
    if (process.env.EVENTS_ENABLED !== 'true') return;
    const tick = () => {
      if (this.stopped || this.busy || this.bus.connected) return;
      this.busy = true;
      this.inFlight = this.bus
        .subscribe(async (raw) => {
          const event = parseOrderEvent(raw);
          await this.record.execute({
            orderId: event.aggregateId,
            productId: event.data.productId,
            quantity: event.data.quantity,
            status: event.data.status,
            version: event.version,
          });
        })
        .catch(() => {
          this.logger.warn(
            'MensajerÃ­a no disponible; se reintentarÃ¡ suscripciÃ³n',
          );
        })
        .finally(() => {
          this.busy = false;
        });
    };
    tick();
    this.timer = setInterval(tick, 3000);
  }
  async onModuleDestroy() {
    this.stopped = true;
    clearInterval(this.timer);
    await this.inFlight;
    await this.bus.close();
  }
}
@Controller('products')
class ActivityController {
  constructor(
    @Inject(GetProductActivity) private readonly get: GetProductActivity,
  ) {}
  @Get(':id/activity') activity(@Param('id') id: string) {
    return this.get.execute(id);
  }
}
@Module({
  controllers: [ActivityController],
  providers: [
    { provide: ActivityRepository, useClass: MongoActivityRepository },
    {
      provide: RecordOrderActivity,
      useFactory: (r: ActivityRepository) => new RecordOrderActivity(r),
      inject: [ActivityRepository],
    },
    {
      provide: GetProductActivity,
      useFactory: (r: ActivityRepository) => new GetProductActivity(r),
      inject: [ActivityRepository],
    },
    {
      provide: BrokerTransport,
      useFactory: () => new BrokerTransport('catalog-order-activity-v1'),
    },
    ActivityConsumer,
  ],
})
export class ActivityModule {}

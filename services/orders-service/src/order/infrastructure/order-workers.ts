import { Inject, Injectable, Logger } from '@nestjs/common';
import type { OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { EventPublisher, OrderViews } from '../domain/ports.js';
import type { OrderEvent } from '../domain/order.js';
import { RelayOutbox } from '../application/orders.js';
import { BrokerTransport } from '../../messaging/broker-transport.js';
import { parseOrderEvent } from '../../messaging/order-event.contract.js';

export class BrokerEventPublisher extends EventPublisher {
  constructor(private readonly bus: BrokerTransport) {
    super();
  }
  publish(event: OrderEvent) {
    return this.bus.publish(event);
  }
}
@Injectable()
export class OrderWorkers implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OrderWorkers.name);
  private timer?: ReturnType<typeof setInterval>;
  private inFlight: Promise<void> = Promise.resolve();
  private busy = false;
  private stopped = false;
  private lastWarning = 0;
  constructor(
    @Inject(BrokerTransport) private readonly bus: BrokerTransport,
    @Inject(RelayOutbox) private readonly relay: RelayOutbox,
    @Inject(OrderViews) private readonly views: OrderViews,
  ) {}
  onModuleInit() {
    const tick = () => {
      if (this.busy || this.stopped) return;
      this.busy = true;
      this.inFlight = (async () => {
        // Publicación y suscripción tienen recuperación independiente.
        const results = await Promise.allSettled([
          this.bus.connected
            ? Promise.resolve()
            : this.bus.subscribe((raw) =>
                this.views.project(parseOrderEvent(raw)),
              ),
          this.relay.execute(),
        ]);
        if (
          results.some((r) => r.status === 'rejected') &&
          Date.now() - this.lastWarning > 15000
        ) {
          this.lastWarning = Date.now();
          this.logger.warn(
            'Broker/proyección pendiente: outbox conserva eventos para reintento',
          );
        }
      })().finally(() => {
        this.busy = false;
      });
    };
    tick();
    this.timer = setInterval(tick, 1000);
  }
  async onModuleDestroy() {
    this.stopped = true;
    clearInterval(this.timer);
    await this.inFlight;
    await this.bus.close();
  }
}

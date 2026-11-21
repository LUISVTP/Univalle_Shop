import { Injectable } from '@nestjs/common';
import type { OnModuleInit } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import type { Connection } from 'mongoose';
import type { mongo } from 'mongoose';
import { OrderConflict, evolve } from '../domain/order.js';
import type { OrderEvent, OrderState } from '../domain/order.js';
import { OrderEventStore, OrderViews, Outbox } from '../domain/ports.js';

interface EventRecord {
  _id: string;
  event: OrderEvent;
  aggregateId: string;
  version: number;
  publishedAt: Date | null;
}
interface ViewRecord extends OrderState {
  _id: string;
}
function duplicate(error: unknown) {
  return (
    !!error &&
    typeof error === 'object' &&
    'code' in error &&
    error.code === 11000
  );
}

@Injectable()
export class MongoOrderStore implements OrderEventStore, Outbox, OnModuleInit {
  private readonly events: mongo.Collection<EventRecord>;
  constructor(@InjectConnection() connection: Connection) {
    this.events = connection.db!.collection<EventRecord>('order_events');
  }
  async onModuleInit() {
    await this.events.createIndex(
      { aggregateId: 1, version: 1 },
      { unique: true },
    );
    await this.events.createIndex({
      publishedAt: 1,
      aggregateId: 1,
      version: 1,
    });
  }
  async append(event: OrderEvent) {
    try {
      // Evento y marca de outbox se insertan en UN documento atÃ³mico.
      await this.events.insertOne({
        _id: event.id,
        event,
        aggregateId: event.aggregateId,
        version: event.version,
        publishedAt: null,
      });
    } catch (error) {
      if (duplicate(error))
        throw new OrderConflict(
          'Conflicto de versiÃ³n; vuelva a consultar el pedido',
        );
      throw error;
    }
  }
  async load(id: string): Promise<OrderEvent[]> {
    const rows = await this.events
      .find({ aggregateId: id })
      .sort({ version: 1 })
      .toArray();
    return rows.map((row) => row.event);
  }
  async pending(): Promise<OrderEvent[]> {
    const rows = await this.events
      .find({ publishedAt: null })
      .sort({ aggregateId: 1, version: 1 })
      .limit(100)
      .toArray();
    return rows.map((row) => row.event);
  }
  async delivered(id: string) {
    await this.events.updateOne(
      { _id: id },
      { $set: { publishedAt: new Date() } },
    );
  }
}

@Injectable()
export class MongoOrderViews extends OrderViews {
  private readonly views: mongo.Collection<ViewRecord>;
  constructor(@InjectConnection() connection: Connection) {
    super();
    this.views = connection.db!.collection<ViewRecord>('order_views');
  }
  async find(id: string): Promise<OrderState | null> {
    const record = await this.views.findOne(
      { _id: id },
      { projection: { _id: 0 } },
    );
    return record as OrderState | null;
  }
  async project(event: OrderEvent) {
    // Duplicados ya aplicados no vuelven a producir efectos.
    const current = await this.find(event.aggregateId);
    if (current && current.version >= event.version) return;
    const state = evolve(current, event);
    if (!current) {
      try {
        await this.views.insertOne({ _id: state.id, ...state });
      } catch (error) {
        if (!duplicate(error)) throw error;
        await this.project(event);
      }
    } else {
      const result = await this.views.updateOne(
        { _id: state.id, version: current.version },
        { $set: state },
      );
      if (!result.matchedCount) await this.project(event);
    }
  }
  async rebuild(state: OrderState) {
    try {
      await this.views.updateOne(
        { _id: state.id, version: { $lte: state.version } },
        { $set: state },
        { upsert: true },
      );
    } catch (error) {
      if (!duplicate(error)) throw error;
    }
  }
}

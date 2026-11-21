import { Kafka, logLevel, Partitioners } from 'kafkajs';
import type { Consumer, Producer } from 'kafkajs';
import amqp from 'amqplib';
import type { ChannelModel, ConfirmChannel, Channel } from 'amqplib';

export interface Envelope {
  id: string;
  aggregateId: string;
}
const queues = ['orders-read-model-v1', 'catalog-order-activity-v1'];
const exchange = 'univalleshop.orders.v1';

// Adaptador de transporte local a cada servicio; no importa código de otro servicio.
export class BrokerTransport {
  private readonly kafka: Kafka;
  private readonly topic = process.env.ORDERS_TOPIC ?? 'univalleshop.orders.v1';
  private producer?: Producer;
  private consumer?: Consumer;
  private connection?: ChannelModel;
  private publisherChannel?: ConfirmChannel;
  private consumerChannel?: Channel;
  private consumerConnection?: ChannelModel;
  private topicReady = false;
  private stopped = false;
  private active = false;
  constructor(private readonly group: string) {
    this.kafka = new Kafka({
      clientId: group,
      brokers: (process.env.KAFKA_BROKERS ?? '127.0.0.1:9092').split(','),
      logLevel: logLevel.NOTHING,
      connectionTimeout: 1000,
      requestTimeout: 3000,
      retry: { retries: 1, initialRetryTime: 200 },
    });
  }
  get connected() {
    return this.active;
  }
  private async ensureTopic() {
    if (this.topicReady) return;
    const admin = this.kafka.admin();
    try {
      await admin.connect();
      await admin.createTopics({
        waitForLeaders: true,
        topics: [{ topic: this.topic, numPartitions: 3, replicationFactor: 1 }],
      });
      this.topicReady = true;
    } finally {
      await admin.disconnect();
    }
  }
  private async rabbitConnection() {
    const username = process.env.AMQP_USER;
    const password = process.env.AMQP_PASSWORD;
    if (!username || !password)
      throw new Error(
        'AMQP_USER y AMQP_PASSWORD son obligatorios para RabbitMQ',
      );
    const connection = await amqp.connect(
      {
        hostname: process.env.AMQP_HOST ?? '127.0.0.1',
        port: Number(process.env.AMQP_PORT ?? 5672),
        username,
        password,
        heartbeat: 5,
      },
      { timeout: 1500 },
    );
    connection.on('error', () => {});
    return connection;
  }
  private async topology(channel: Channel) {
    await channel.assertExchange(exchange, 'fanout', { durable: true });
    // Declaradas antes de publicar: los dos destinos conservan mensajes incluso si un consumidor no arrancó.
    for (const queue of queues) {
      await channel.assertQueue(queue, { durable: true });
      await channel.bindQueue(queue, exchange, '');
    }
  }
  async publish(event: Envelope) {
    if (this.stopped) throw new Error('Transporte cerrado');
    if ((process.env.EVENT_TRANSPORT ?? 'kafka') === 'rabbitmq') {
      if (!this.publisherChannel) {
        this.connection = await this.rabbitConnection();
        const channel = await this.connection.createConfirmChannel();
        channel.on('error', () => {});
        this.connection.on('close', () => {
          this.publisherChannel = undefined;
        });
        channel.on('close', () => {
          this.publisherChannel = undefined;
        });
        await this.topology(channel);
        this.publisherChannel = channel;
      }
      const channel = this.publisherChannel;
      await new Promise<void>((resolve, reject) => {
        channel.publish(
          exchange,
          '',
          Buffer.from(JSON.stringify(event)),
          {
            persistent: true,
            messageId: event.id,
            contentType: 'application/json',
          },
          (error) => (error ? reject(error) : resolve()),
        );
      });
    } else {
      await this.ensureTopic();
      if (!this.producer) {
        const producer = this.kafka.producer({
          createPartitioner: Partitioners.DefaultPartitioner,
          maxInFlightRequests: 1,
          retry: { retries: 1 },
        });
        await producer.connect();
        this.producer = producer;
      }
      await this.producer.send({
        topic: this.topic,
        acks: -1,
        messages: [{ key: event.aggregateId, value: JSON.stringify(event) }],
      });
    }
  }
  async subscribe(handler: (value: unknown) => Promise<void>) {
    if (this.stopped || this.active) return;
    if ((process.env.EVENT_TRANSPORT ?? 'kafka') === 'rabbitmq') {
      const connection = await this.rabbitConnection();
      const channel = await connection.createChannel();
      channel.on('error', () => {});
      connection.on('close', () => {
        this.active = false;
      });
      channel.on('close', () => {
        this.active = false;
      });
      await this.topology(channel);
      await channel.prefetch(1);
      await channel.consume(
        this.group,
        (message) => {
          if (!message) return;
          void (async () => {
            try {
              await handler(JSON.parse(message.content.toString()));
              channel.ack(message);
            } catch {
              // No confirmar antes de persistir; pausa breve evita un bucle de reentrega agresivo.
              await new Promise((resolve) => setTimeout(resolve, 500));
              try {
                channel.nack(message, false, true);
              } catch {}
            }
          })();
        },
        { noAck: false },
      );
      this.consumerConnection = connection;
      this.consumerChannel = channel;
    } else {
      await this.ensureTopic();
      if (this.consumer) await this.consumer.disconnect();
      const consumer = this.kafka.consumer({
        groupId: this.group + (process.env.EVENT_GROUP_SUFFIX ?? ''),
        sessionTimeout: 10000,
        heartbeatInterval: 1000,
        retry: { retries: 2 },
      });
      this.consumer = consumer;
      consumer.on(consumer.events.CRASH, () => {
        this.active = false;
      });
      await consumer.connect();
      await consumer.subscribe({ topic: this.topic, fromBeginning: true });
      await consumer.run({
        eachMessage: async ({ message }) => {
          if (!message.value) throw new Error('Evento vacío');
          await handler(JSON.parse(message.value.toString()));
        },
      });
    }
    this.active = true;
  }
  async close() {
    this.stopped = true;
    await Promise.allSettled([
      this.consumer?.disconnect(),
      this.producer?.disconnect(),
      this.consumerChannel?.close(),
      this.consumerConnection?.close(),
      this.publisherChannel?.close(),
      this.connection?.close(),
    ]);
    this.active = false;
  }
}

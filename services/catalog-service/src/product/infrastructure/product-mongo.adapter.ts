import { Injectable } from '@nestjs/common';
import { InjectModel, Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type { Product } from '../domain/product.js';
import { ProductReader, ProductRepository } from '../domain/product.js';

@Schema({ collection: 'products', timestamps: true })
export class ProductDocument {
  @Prop({ required: true }) name: string;
  @Prop({ required: true, min: 0 }) price: number;
  @Prop({ required: true, min: 0 }) stock: number;
}
export const ProductSchema = SchemaFactory.createForClass(ProductDocument);

@Injectable()
export class ProductMongoAdapter
  extends ProductRepository
  implements ProductReader
{
  constructor(
    @InjectModel(ProductDocument.name)
    private readonly model: Model<ProductDocument>,
  ) {
    super();
  }
  async save(product: Product): Promise<Product> {
    const saved = await this.model.create(product);
    return {
      id: saved._id.toString(),
      name: saved.name,
      price: saved.price,
      stock: saved.stock,
    };
  }
  async find(id: string): Promise<Product | null> {
    const row = await this.model.findById(id).lean().exec();
    return row
      ? {
          id: row._id.toString(),
          name: row.name,
          price: row.price,
          stock: row.stock,
        }
      : null;
  }
  async list(): Promise<Product[]> {
    const rows = await this.model
      .find()
      .sort({ _id: 1 })
      .limit(100)
      .lean()
      .exec();
    return rows.map((row) => ({
      id: row._id.toString(),
      name: row.name,
      price: row.price,
      stock: row.stock,
    }));
  }
}

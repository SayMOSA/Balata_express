import mongoose from 'mongoose';
import { config } from './configuration';

export async function connectDatabase(): Promise<void> {
  mongoose.connection.on('connected', () => {
    console.log('=> MongoDB connected successfully');
  });
  mongoose.connection.on('error', (error: Error) => {
    console.error('=> MongoDB connection error: ', error);
  });

  await mongoose.connect(config.mongodbUri);
}

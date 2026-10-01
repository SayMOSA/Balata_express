import { connectDatabase } from '../src/config/database';
import { createApp } from '../src/app';

const app = createApp();

let isConnected = false;
async function handler(req: any, res: any) {
  if (!isConnected) {
    await connectDatabase();
    isConnected = true;
  }
  return app(req, res);
}

export default handler;
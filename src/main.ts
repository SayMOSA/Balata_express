import { config } from './config/configuration';
import { connectDatabase } from './config/database';
import { createApp } from './app';
import { startJobs } from './jobs';

async function bootstrap() {
  await connectDatabase();

  const app = createApp();
  app.listen(config.port, () => {
    console.log(`Application is running on port: ${config.port}`);
    console.log(`Swagger docs: http://localhost:${config.port}/api/docs`);
  });

  startJobs();
}

bootstrap().catch((err) => {
  console.error('Failed to start application:', err);
  process.exit(1);
});

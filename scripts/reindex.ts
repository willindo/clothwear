import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { SearchService } from 'src/search/search.service';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['log', 'warn', 'error', 'debug'],
  });
  const search = app.get(SearchService);
  await search.reindexAllProducts();
  await app.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

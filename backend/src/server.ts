import { config } from "./config.js";
import { createApp } from "./app.js";
import { startPriceJob } from "./pricing/job.js";

const app = createApp();

app.listen(config.port, () => {
  console.log(`DrinkExchange API teče na http://localhost:${config.port}`);
  // ADR-0006: v MVP teče opravilo v isti (edini) instanci backenda.
  startPriceJob();
});

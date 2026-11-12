import { config } from "./config.js";
import { createApp } from "./app.js";

const app = createApp();

app.listen(config.port, () => {
  console.log(`DrinkExchange API teče na http://localhost:${config.port}`);
});

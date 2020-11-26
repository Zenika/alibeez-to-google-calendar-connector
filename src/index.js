import { createServer } from "./server.js";
import { setupLogging } from "./setupLogging.js";

setupLogging()

const port = process.env.PORT || 3000;

createServer().listen(port, () => {
  console.log(`Listening on port ${port}`);
});

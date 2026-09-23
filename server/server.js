import { app } from "./app.js";

const PORT = Number(process.env.PORT || 3000);

const server = app.listen(PORT, () => {
  console.log(`AI Company OS backend running on :${PORT}`);
});

function shutdown(signal) {
  console.log(`AI Company OS backend received ${signal}`);
  server.close(() => process.exit(0));
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

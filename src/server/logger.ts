import pino from "pino";

export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  base: { service: "wms" },
  redact: {
    paths: ["password", "initialPassword", "*.password", "*.initialPassword", "req.headers.cookie"],
    remove: true
  }
});

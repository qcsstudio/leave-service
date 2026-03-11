const Queue = require("bull");

const holidayQueue = new Queue("holiday-queue", {
  redis: {
    host: "127.0.0.1",
    port: 6379
  }
});

module.exports = holidayQueue;
require("dotenv").config();

const app = require("./app");
const connectDB = require("./config/db");

require("../src/modules/workers/holiday.worker");

const PORT = process.env.PORT || 5003;

const startServer = async () => {
  await connectDB();

  app.listen(PORT, () => {
    console.log(`🚀 Attendance Service running on port ${PORT}`);
  });
};

startServer();
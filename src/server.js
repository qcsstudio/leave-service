require("dotenv").config();

const app = require("./app");
const connectDB = require("./config/db");

require("../src/modules/workers/holiday.worker");

const lanPoller = require("./modules/biometric/lanPoller.service");

const PORT = process.env.PORT || 5003;

const startServer = async () => {
  await connectDB();

  app.listen(PORT, () => {
    console.log(`🚀 Attendance Service running on port ${PORT}`);

    // ⭐ Start biometric polling
    setInterval(async () => {
      console.log("🔄 Checking biometric devices...");
      await lanPoller.pollDevices();
    }, 15000); // every 15 seconds
  });
};

startServer();
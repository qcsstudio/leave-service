// require("dotenv").config();

// const app = require("./app");
// const connectDB = require("./config/db");

// require("../src/modules/workers/holiday.worker");

// const lanPoller = require("./modules/biometric/lanPoller.service");

// const PORT = process.env.PORT || 5003;

// const startServer = async () => {
//   await connectDB();

//   app.listen(PORT, () =>
    
    
//     {
//     console.log(`🚀 Attendance Service running on port ${PORT}`);

//     // ⭐ Start biometric polling
//     setInterval(async () => {
//       console.log("🔄 Checking biometric devices...");
//       await lanPoller.pollDevices();
//     }, 15000); // every 15 seconds
//   });
// };

// startServer();


require("dotenv").config();

const app = require("./app");
const connectDB = require("./config/db");

// :white_check_mark: Workers
require("./modules/workers/holiday.worker");

// :white_check_mark: LAN Poller (old method)
const lanPoller = require("./modules/biometric/lanPoller.service");

const PORT = process.env.PORT || 5003;

const startServer = async () => {
  try {
    // :white_check_mark: Connect DB
    await connectDB();
    console.log(":white_check_mark: Database connected");

    // :white_check_mark: Start Server
    app.listen(PORT, () => {
      console.log("====================================");
      console.log(`:rocket: Attendance Service running on port ${PORT}`);
      console.log(":satellite_antenna: Modes Enabled:");
      console.log("   :point_right: ADMS Push Mode (/biometric/push)");
      console.log("   :point_right: LAN Polling Mode (Port 4370)");
      console.log("====================================");

      // :fire: Start LAN Polling (only works if device supports TCP/IP)
      setInterval(() => {
    lanPoller.pollDevices().catch(err => {
      console.error(":x: Poller Crash:", err.message);
    });
  }, 30000);// every 15 sec
    });

  } catch (error) {
    console.error(":x: Server start failed:", error);
  }
};

startServer();
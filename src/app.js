const express = require("express");
const cors = require("cors");

const app = express();

// ✅ Proper CORS setup (handles preflight OPTIONS automatically)
app.use(cors({
  origin: function (origin, callback) {
    // Allow non-browser requests (Postman, curl)
    if (!origin) return callback(null, true);

    // Allow frontend domains
    if (origin.endsWith(".qcsstudios.com") || origin === "https://qcsstudios.com") {
      return callback(null, true);
    }

    // Block other domains
    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true, // allows cookies / auth headers
  optionsSuccessStatus: 204 // ensures OPTIONS preflight returns 204
}));

app.use(express.json());
app.use("/uploads", express.static("uploads"));

// 🚀 Routes
app.use("/leave", require("./modules/leave/leave.routes"));
app.use("/holiday", require("./modules/holiday/holiday.routes"));
app.use("/attendance", require("./modules/attendance/attendance.routes"));
app.use("/break", require("./modules/break/break.routes"));
app.use("/biometric", require("./modules/biometric/device.routes"));
app.use("/regularization", require("./modules/regularization/regularization.routes"));
app.use("/dashboard", require("./modules/dashboard/dashboard.routes"));

// Health check
app.get("/", (req, res) => {
  res.json({ status: "Attendance Service Running 🚀" });
});

module.exports = app;
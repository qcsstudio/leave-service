const express = require("express");
const cors = require("cors");

const app = express();

// ✅ Allowed origins
const allowedOrigins = [
  "https://qcsstudios.com",
  "https://www.qcsstudios.com",
  "http://localhost:5173" // <- for local frontend development
];

// ✅ CORS middleware
app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true); // Postman/curl

    if (allowedOrigins.includes(origin) || origin.endsWith(".qcsstudios.com")) {
      return callback(null, true);
    }

    console.log("Blocked CORS for origin:", origin);
    return callback(null, false);
  },
  credentials: true,
  optionsSuccessStatus: 204
}));


// ✅ Global OPTIONS handler
app.use((req, res, next) => {
  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }
  next();
});

app.use(express.json());
app.use("/uploads", express.static("uploads"));
app.use(express.urlencoded({ extended: true }));


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
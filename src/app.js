const express = require("express");
const cors = require("cors");

const app = express();

/*
  ✅ Dynamic CORS for multi-company subdomains
  ✅ Supports withCredentials: true
*/
app.use(cors({
  origin: function (origin, callback) {
    // allow requests with no origin (mobile apps, curl, postman)
    if (!origin) return callback(null, true);

    // Allow all qcsstudios subdomains
    if (
      origin.endsWith(".qcsstudios.com") ||
      origin === "https://qcsstudios.com"
    ) {
      return callback(null, origin);
    }

    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

// Handle preflight explicitly
app.options("*", cors());

app.use(express.json());
app.use("/uploads", express.static("uploads"));

app.use("/leave", require("./modules/leave/leave.routes"));
app.use("/attendance", require("./modules/attendance/attendance.routes"));
app.use("/biometric", require("./modules/biometric/device.routes"));

app.get("/", (req, res) => {
  res.json({ status: "Attendance Service Running 🚀" });
});

module.exports = app;
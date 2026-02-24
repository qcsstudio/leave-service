const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);

    if (
      origin.endsWith(".qcsstudios.com") ||
      origin === "https://qcsstudios.com"
    ) {
      return callback(null, origin);
    }

    return callback(null, false);
  },
  credentials: true
}));

app.use(express.json());
app.use("/uploads", express.static("uploads"));

app.use("/leave", require("./modules/leave/leave.routes"));
app.use("/attendance", require("./modules/attendance/attendance.routes"));
app.use("/biometric", require("./modules/biometric/device.routes"));

app.get("/", (req, res) => {
  res.json({ status: "Attendance Service Running 🚀" });
});

module.exports = app;
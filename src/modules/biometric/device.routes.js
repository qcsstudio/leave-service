// ./modules/biometric/device.routes.js
const router = require("express").Router();

const deviceController = require("./device.controller");
const eventController = require("./event.controller");

const auth = require("../../middlewares/auth.middleware");

// Admin routes
router.post("/device", auth, deviceController.addDevice);
router.get("/device", auth, deviceController.listDevices);
router.delete("/device/:id", auth, deviceController.removeDevice);

// Machine webhook (ADMS push)
router.post("/event", eventController.receiveEvent);
// ./modules/biometric/device.routes.js
router.post("/event", eventController.receiveEvent); // keep this
router.post("/biometric/event", eventController.receiveEvent); // optional duplicate
module.exports = router;
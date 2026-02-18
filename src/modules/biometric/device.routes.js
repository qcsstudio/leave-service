const router = require("express").Router();

const deviceController = require("./device.controller");
const eventController = require("./event.controller");

const auth = require("../../middlewares/auth.middleware");


// Admin
router.post("/device", auth, deviceController.addDevice);
router.get("/device", auth, deviceController.listDevices);
router.delete("/device/:id", auth, deviceController.removeDevice);


// Machine webhook
router.post("/event", eventController.receiveEvent);

module.exports = router;

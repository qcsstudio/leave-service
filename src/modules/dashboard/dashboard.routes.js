const router = require("express").Router();
const controller = require("./dashboard.controller");
const auth = require("../../middlewares/auth.middleware");

router.get("/", auth, controller.getAttendanceDashboard);

module.exports = router;

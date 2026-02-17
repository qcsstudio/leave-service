const router = require("express").Router();
const controller = require("./attendance.controller");
const auth = require("../../middlewares/auth.middleware");
// const { roleGuard }= require("../../middlewares/role.middleware");

router.post("/punch-in", auth, controller.punchIn);
router.post("/punch-out", auth, controller.punchOut);
router.get("/today", auth, controller.todayStatus);

router.get("/calendar", auth, controller.monthCalendar);

module.exports = router;

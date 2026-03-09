const router = require("express").Router();
const controller = require("./holiday.controller");
const auth = require("../../middlewares/auth.middleware");

router.post("/", auth, controller.addHoliday);
router.get("/", auth, controller.getHolidays);
router.get("/upcoming", auth, controller.upcomingHolidays);
router.put("/:holidayId", auth, controller.updateHoliday);
router.delete("/:holidayId", auth, controller.deleteHoliday);

module.exports = router;

const router = require("express").Router();
const controller = require("./break.controller");
const auth = require("../../middlewares/auth.middleware");

router.post("/start", auth, controller.startBreak);
router.post("/end", auth, controller.endBreak);
router.get("/status", auth, controller.breakStatus);
router.get("/today", auth, controller.todayBreaks);

module.exports = router;

const router = require("express").Router();
const controller = require("./leave.controller");
const auth = require("../../middlewares/auth.middleware");
const upload = require("../../utils/upload");

router.post("/apply",auth,upload.single("attachment"), controller.applyLeave);

router.patch("/:leaveId/action", auth, controller.takeAction);

router.get("/my-leaves", auth, controller.myLeaves);

router.get("/pending", auth, controller.pendingLeaves);


module.exports = router;

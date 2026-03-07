const router = require("express").Router();
const controller = require("./regularization.controller");
const auth = require("../../middlewares/auth.middleware");
const upload = require("../../utils/upload");

// Employee
router.post("/", auth, upload.single("attachment"), controller.create);
router.get("/my-requests", auth, controller.myRequests);

// HR
router.get("/pending", auth, controller.pendingRequests);
router.get("/all", auth, controller.allRequests);
router.patch("/:id/action", auth, controller.takeAction);

module.exports = router;

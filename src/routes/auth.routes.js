const express = require("express");
const authcontroller = require("../controllers/auth.controller.js");

const router = express.Router();



router.post("/register", authcontroller.userRegisterController);
router.post("/login", authcontroller.userLoginController);



module.exports = router;
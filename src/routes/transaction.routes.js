const express = require("express");
const authMiddleware = require("../middleware/auth.middleware.js");
const transactionController = require("../controllers/transaction.controller.js");

const router = express.Router();


router.post("/", authMiddleware.authMiddleware, transactionController.createTransaction);
router.post("/initial-funds", authMiddleware.authSystemUserMiddleware, transactionController.createInitialFundsTransaction);

module.exports = router;
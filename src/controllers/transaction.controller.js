const transactionModel = require("../models/transaction.model.js");
const ledgerModel = require("../models/ledger.model.js");
const emailService = require("../services/email.service.js");


// create a new transacrion
/*

transaction flow
  1. validate request
  2. validate idempotency key
  3. check account status
  4. derive sender balance from ledger
  5. create transaction (PENDING)
  6. create debit ledger entry
  7. create credit ledger entry
  8. mark transaction COMPLETED
  9. commit mongoDB session
  10. send email notification

*/




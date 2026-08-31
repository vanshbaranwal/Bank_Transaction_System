const ledgerModel = require("../models/ledger.model.js");
const emailService = require("../services/email.service.js");
const mongoose = require("mongoose");
const transactionModel = require("../models/transaction.model.js");
const accountModel = require("../models/account.model.js");

// create a new transaction
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

async function createTransaction(req, res){
    
    // 1. validate request
    
    const { fromAccount, toAccount, amount, idempotencyKey } = req.body;

    if(!fromAccount || !toAccount || !amount || !idempotencyKey){
        return res.status(400).json({
            message: "fromAccount, toAccount, amount and idempotencyKey are required"
        });
    }

    const fromUserAccount = await accountModel.findOne({
        _id: fromAccount,
    });

    const toUserAccount = await accountModel.findOne({
        _id: toAccount,
    });

    if(!fromUserAccount || !toUserAccount){
        return res.status(400).json({
            message: "invalid fromAccount or toAccount",
        });
    }

    
    // 2. validate idempotecyKey (we use idempotency key so that the same payment should now be occuring two times)

    const isTransactionAlreadyExists = await transactionModel.findOne({
        idempotencyKey: idempotencyKey
    });

    if(isTransactionAlreadyExists){
        if(isTransactionAlreadyExists.status === "COMPLETED"){
            return res.status(200).json({
                message: "transaction already processed",
                transaction: isTransactionAlreadyExists,
            });
        }

        if(isTransactionAlreadyExists.status === "PENDING"){
            return res.status(200).json({
                message: "transaction is still in processing",
            });
        }

        if(isTransactionAlreadyExists.status === "FAILED"){
            return res.status(500).json({
                message: "transaction processing failed, please retry",
            });
        }

        if(isTransactionAlreadyExists.status === "REVERSED"){
            return res.status(500).json({
                message: "transaction was reversed, please retry",
            });
        }
    }


    // 3. check account status

    if(fromUserAccount.status !== "ACTIVE" || toUserAccount.status !== "ACTIVE"){
        return res.status(400).json({
            message: "both fromAccount and toAccount must be ACTIVE to process transaction",
        });    
    }

    // 4. derive sender balance from ledger (using aggregation pipeline)

    const balance = await fromUserAccount.getBalance();

    if(balance < amount){
        return res.status(400).json({
            message: `insufficient balance. current balance is ${balance}, and the requested amount is ${amount}`
        });
    }
    
    // 5. create transaction (PENDING)

    const session = await mongoose.startSession();
    session.startTransaction();

    const transaction = await transactionModel.create({
        fromAccount,
        toAccount,
        amount,
        idempotencyKey,
        status: "PENDING"
    }, { session });

    // 6. debitledger entry

    const debitLedgerEntry = await ledgerModel.create({
        account: fromAccount,
        amount: amount,
        transaction: transaction._id,
        type: "DEBIT",
    }, { session });

    // 7. credit ledger entry

    const creditLedgerEntry = await ledgerModel.create({
        account: toAccount,
        amount: amount,
        transaction: transaction._id,
        type: "CREDIT"
    }, { session });
        
    // 8. mark transaction completed
    
    transaction.status = "COMPLETED";
    await transaction.save({ session });

    // 9. commit mongoDB session
    
    await session.commitTransaction();
    session.endSession();

    // 10. send email notification

    await emailService.sendTransactionEmail(req.user.email, req.user.name, amount, toAccount);

    return res.status(201).json({
        message: "transaction completed successfully",
        transaction: transaction
    });

};


module.exports = {
    createTransaction
};


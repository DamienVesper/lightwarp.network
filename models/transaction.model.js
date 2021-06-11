const mongoose = require(`mongoose`);

const TransactionSchema = new mongoose.Schema({
    transactionID: { type: String, required: true },
    name: { type: String, required: true },
    arg: { type: String, required: true },
    price: {type: String, required: true },
    paid: {type: Boolean, required: true, default: false }
}, {timestamps: true, collection: `Transactions`});

const Transaction = mongoose.model(`Transaction`, TransactionSchema);

module.exports = Transaction;
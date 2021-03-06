const Mongoose = require(`mongoose`);

const TransactionSchema = new Mongoose.Schema({
    transactionID: { type: String, required: true },
    name: { type: String, required: true },
    arg: { type: String, required: true },
    price: { type: String, required: true },
    paid: {type: Boolean, required: false, default: false },
    type: {type: String, required: true}
}, { timestamps: true });

const Transaction = Mongoose.model(`Transaction`, TransactionSchema);

module.exports = Transaction;

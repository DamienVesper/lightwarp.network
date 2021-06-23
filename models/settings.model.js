const Mongoose = require(`mongoose`);

const SettingsSchema = new Mongoose.Schema({
    id: { type: String, required: true, default: `settings`},
    paused: { type: Boolean, required: true }
}, { timestamps: true });

const Transaction = Mongoose.model(`Settings`, SettingsSchema);

module.exports = Transaction;

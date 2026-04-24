const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    fromUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    toUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true, min: 0.01 },
    description: { type: String, required: true },
    tags: [{ type: String }],
    status: { 
        type: String, 
        enum: ['UNCONFIRMED', 'CONFIRMED', 'DISPUTED', 'SETTLED'], 
        default: 'UNCONFIRMED' 
    },
    type: {
        type: String,
        enum: ['LOAN', 'REPAYMENT'],
        default: 'LOAN'
    },
    parentLoanId: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction' }, // If it's a repayment, link to original loan
    proofOfPayment: { type: String }, // Path to uploaded file
    isSoftDeleted: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Transaction', transactionSchema);

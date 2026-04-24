const Transaction = require('../models/Transaction');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const Notification = require('../models/Notification');
const { sendNotification } = require('../services/emailService');

// Helper to notify user
const notifyUser = async (userId, message, type, transactionId = null) => {
    await Notification.create({ userId, message, type, relatedTransaction: transactionId });
    const user = await User.findById(userId);
    if (user && user.isRegistered) {
        await sendNotification(user, message);
    }
};

exports.createTransaction = async (req, res) => {
    try {
        const { amount, description, tags, direction } = req.body;
        const targetUser = req.body.targetUser || req.body.toUser;
        
        // Prevent sending to self
        if (req.user._id.toString() === targetUser) {
            return res.status(400).json({ success: false, message: 'Cannot create loan for yourself' });
        }

        let fromUser, toUser;
        // A loan type transaction means: fromUser lent money to toUser
        // If direction is 'borrowed', then the targetUser lent it to the currentUser
        if (direction === 'borrowed') {
            fromUser = targetUser;
            toUser = req.user._id;
        } else {
            // Default: 'lent'
            fromUser = req.user._id;
            toUser = targetUser;
        }

        const transaction = await Transaction.create({
            createdBy: req.user._id,
            fromUser: fromUser,
            toUser: toUser,
            amount,
            description,
            tags,
            status: 'UNCONFIRMED',
            type: 'LOAN'
        });

        await AuditLog.create({ userId: req.user._id, action: 'CREATE_LOAN', details: { transactionId: transaction._id } });

        const message = direction === 'borrowed' 
            ? `${req.user.firstName} claims they borrowed ₹${amount} from you. Please confirm.`
            : `${req.user.firstName} added a loan of ₹${amount} to you. Please confirm.`;

        await notifyUser(targetUser, message, 'INFO', transaction._id);

        res.status(201).json({ success: true, data: transaction });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getTransactions = async (req, res) => {
    try {
        const transactions = await Transaction.find({
            $or: [{ fromUser: req.user._id }, { toUser: req.user._id }],
            isSoftDeleted: false
        }).populate('fromUser toUser', 'firstName lastName username email phone profilePhoto isRegistered')
          .sort('-createdAt');

        res.json({ success: true, data: transactions });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.confirmTransaction = async (req, res) => {
    try {
        const transaction = await Transaction.findById(req.params.id);
        if (!transaction) return res.status(404).json({ success: false, message: 'Transaction not found' });

        if (transaction.createdBy.toString() === req.user._id.toString()) {
            return res.status(403).json({ success: false, message: 'Not authorized to confirm your own request' });
        }

        if (transaction.status !== 'UNCONFIRMED') {
            return res.status(400).json({ success: false, message: 'Transaction already processed' });
        }

        transaction.status = 'CONFIRMED';
        await transaction.save();

        if (transaction.type === 'REPAYMENT' && transaction.parentLoanId) {
            const parentLoan = await Transaction.findById(transaction.parentLoanId);
            if (parentLoan) {
                const repayments = await Transaction.find({ parentLoanId: transaction.parentLoanId, type: 'REPAYMENT', status: 'CONFIRMED' });
                const totalRepaid = repayments.reduce((acc, curr) => acc + curr.amount, 0);
                if (totalRepaid >= parentLoan.amount) {
                    parentLoan.status = 'SETTLED';
                    await parentLoan.save();
                }
            }
        }

        await AuditLog.create({ userId: req.user._id, action: 'CONFIRM_LOAN', details: { transactionId: transaction._id } });

        await notifyUser(transaction.createdBy, `${req.user.firstName} confirmed the loan of ₹${transaction.amount}.`, 'SUCCESS', transaction._id);

        res.json({ success: true, data: transaction });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.disputeTransaction = async (req, res) => {
    try {
        const transaction = await Transaction.findById(req.params.id);
        if (!transaction) return res.status(404).json({ success: false, message: 'Transaction not found' });

        if (transaction.createdBy.toString() === req.user._id.toString()) {
            return res.status(403).json({ success: false, message: 'Not authorized to dispute your own request' });
        }

        transaction.status = 'DISPUTED';
        await transaction.save();

        await AuditLog.create({ userId: req.user._id, action: 'DISPUTE_LOAN', details: { transactionId: transaction._id } });

        await notifyUser(transaction.createdBy, `${req.user.firstName} disputed the loan of ₹${transaction.amount}.`, 'WARNING', transaction._id);

        res.json({ success: true, data: transaction });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.makeRepayment = async (req, res) => {
    try {
        const { amount, description } = req.body;
        const parentLoanId = req.params.id;

        const parentLoan = await Transaction.findById(parentLoanId);
        if (!parentLoan) return res.status(404).json({ success: false, message: 'Parent loan not found' });
        
        if (parentLoan.status !== 'CONFIRMED') {
            return res.status(400).json({ success: false, message: 'Can only repay confirmed loans' });
        }

        // Calculate remaining balance including pending repayments
        const existingRepayments = await Transaction.find({ 
            parentLoanId, 
            type: 'REPAYMENT', 
            status: { $in: ['CONFIRMED', 'UNCONFIRMED'] } 
        });
        const totalPaidOrPending = existingRepayments.reduce((acc, curr) => acc + curr.amount, 0);
        const remainingBalance = parentLoan.amount - totalPaidOrPending;

        if (remainingBalance <= 0) {
            return res.status(400).json({ success: false, message: 'This loan has already been fully repaid or has pending repayments covering the balance.' });
        }

        if (amount > remainingBalance) {
            return res.status(400).json({ 
                success: false, 
                message: `Amount exceeds remaining balance. You can only repay up to ₹${remainingBalance.toFixed(2)}.` 
            });
        }

        // Create repayment
       // Create repayment
        const repayment = await Transaction.create({
            createdBy: req.user._id,
            fromUser: parentLoan.toUser, 
            toUser: parentLoan.fromUser, 
            amount,
            description,
            type: 'REPAYMENT',
            parentLoanId,
            status: 'UNCONFIRMED'
        });

        // Convert the uploaded file buffer into a Base64 string
        if (req.file) {
            const b64 = Buffer.from(req.file.buffer).toString('base64');
            const dataURI = "data:" + req.file.mimetype + ";base64," + b64;
            repayment.proofOfPayment = dataURI; // Save string to MongoDB
            await repayment.save();
        }

        const notifyTarget = parentLoan.fromUser.toString() === req.user._id.toString() ? parentLoan.toUser : parentLoan.fromUser;
        await notifyUser(notifyTarget, `${req.user.firstName} uploaded a repayment of ₹${amount}. Please review and confirm it.`, 'INFO', repayment._id);

        res.status(201).json({ success: true, data: repayment });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getDashboardStats = async (req, res) => {
    try {
        const userId = req.user._id;

        const allTransactions = await Transaction.find({
            $or: [{ fromUser: userId }, { toUser: userId }],
            isSoftDeleted: false
        });

        let totalGiven = 0; // Money I lent
        let totalTaken = 0; // Money I borrowed
        let pendingGiven = 0; // Unconfirmed I lent
        let pendingTaken = 0; // Unconfirmed I borrowed

        allTransactions.forEach(t => {
            if (t.type === 'LOAN') {
                if (t.fromUser.toString() === userId.toString()) {
                    if (t.status === 'CONFIRMED') totalGiven += t.amount;
                    if (t.status === 'UNCONFIRMED') pendingGiven += t.amount;
                } else if (t.toUser.toString() === userId.toString()) {
                    if (t.status === 'CONFIRMED') totalTaken += t.amount;
                    if (t.status === 'UNCONFIRMED') pendingTaken += t.amount;
                }
            } else if (t.type === 'REPAYMENT' && t.status === 'CONFIRMED') {
                if (t.fromUser.toString() === userId.toString()) {
                    totalTaken -= t.amount; // I paid back what I borrowed
                } else if (t.toUser.toString() === userId.toString()) {
                    totalGiven -= t.amount; // They paid back what I lent
                }
            }
        });

        res.json({
            success: true,
            data: { totalGiven, totalTaken, pendingGiven, pendingTaken }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getContactsWithBalances = async (req, res) => {
    try {
        const userId = req.user._id;

        const transactions = await Transaction.find({
            $or: [{ fromUser: userId }, { toUser: userId }],
            isSoftDeleted: false,
            status: 'CONFIRMED'
        }).populate('fromUser toUser', 'firstName lastName username email phone profilePhoto isRegistered');

        const contactsMap = {};

        transactions.forEach(t => {
            const isGiven = t.fromUser._id.toString() === userId.toString();
            const otherUser = isGiven ? t.toUser : t.fromUser;
            const otherId = otherUser._id.toString();

            if (!contactsMap[otherId]) {
                contactsMap[otherId] = {
                    user: otherUser,
                    netBalance: 0
                };
            }

            if (t.type === 'LOAN') {
                if (isGiven) {
                    contactsMap[otherId].netBalance += t.amount;
                } else {
                    contactsMap[otherId].netBalance -= t.amount;
                }
            } else if (t.type === 'REPAYMENT') {
                if (isGiven) {
                    contactsMap[otherId].netBalance += t.amount;
                } else {
                    contactsMap[otherId].netBalance -= t.amount;
                }
            }
        });

        const contacts = Object.values(contactsMap).map(c => ({
            ...c,
            netBalance: parseFloat(c.netBalance.toFixed(2))
        }));

        res.json({ success: true, data: contacts });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getChatHistory = async (req, res) => {
    try {
        const userId = req.user._id;
        const targetUserId = req.params.userId;

        const transactions = await Transaction.find({
            $or: [
                { fromUser: userId, toUser: targetUserId },
                { fromUser: targetUserId, toUser: userId }
            ],
            isSoftDeleted: false
        }).populate('fromUser toUser', 'firstName lastName username email phone profilePhoto isRegistered')
          .sort('createdAt');

        res.json({ success: true, data: transactions });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

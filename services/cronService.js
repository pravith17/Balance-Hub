const cron = require('node-cron');
const Transaction = require('../models/Transaction');
const { sendNotification } = require('./emailService');
const User = require('../models/User');

const startCronJobs = () => {
    // Run daily at 9:00 AM
    cron.schedule('0 9 * * *', async () => {
        console.log('Running daily reminder cron job...');
        try {
            // Find all unconfirmed transactions older than 3 days
            const threeDaysAgo = new Date();
            threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

            const pendingLoans = await Transaction.find({
                status: 'UNCONFIRMED',
                type: 'LOAN',
                createdAt: { $lte: threeDaysAgo }
            }).populate('toUser');

            for (const loan of pendingLoans) {
                if (loan.toUser.isRegistered) {
                    const message = `Reminder: You have a pending loan request of $${loan.amount} waiting for your confirmation. Please log in to confirm or dispute it.`;
                    await sendNotification(loan.toUser, message);
                }
            }
        } catch (error) {
            console.error('Error in daily cron job:', error);
        }
    });
};

module.exports = { startCronJobs };

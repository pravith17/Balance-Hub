const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transactionController');
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.use(protect);

router.route('/')
    .get(transactionController.getTransactions)
    .post(transactionController.createTransaction);

router.get('/dashboard', transactionController.getDashboardStats);
router.get('/contacts', transactionController.getContactsWithBalances);
router.get('/chat/:userId', transactionController.getChatHistory);

router.put('/:id/confirm', transactionController.confirmTransaction);
router.put('/:id/dispute', transactionController.disputeTransaction);
router.post('/:id/repay', upload.single('proof'), transactionController.makeRepayment);

module.exports = router;

const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.use(protect); // All routes below require auth

router.route('/profile')
    .get(userController.getProfile)
    .put(upload.single('profilePhoto'), userController.updateProfile);

router.get('/search', userController.searchUsers);
router.post('/external', userController.addExternalContact);

module.exports = router;

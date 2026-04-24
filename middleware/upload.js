const multer = require('multer');
const path = require('path');

// Change from diskStorage to memoryStorage
const storage = multer.memoryStorage();

// Check File Type
function checkFileType(file, cb) {
    // Allowed ext
    const filetypes = /jpeg|jpg|png|pdf/;
    // Check ext
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    // Check mime
    const mimetype = filetypes.test(file.mimetype);

    if (mimetype && extname) {
        return cb(null, true);
    } else {
        cb('Error: Images and PDFs Only!');
    }
}

// Init Upload
const upload = multer({
    storage: storage,
    limits: { fileSize: 5000000 }, // 5MB limit protects MongoDB's 16MB document limit
    fileFilter: function(req, file, cb) {
        checkFileType(file, cb);
    }
});

module.exports = upload;

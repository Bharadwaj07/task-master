const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { fileUpload } = require('../shared/constants');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, fileUpload.UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  if (fileUpload.ALLOWED_FILE_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('File type not allowed'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: fileUpload.MAX_FILE_SIZE }
});

module.exports = upload;

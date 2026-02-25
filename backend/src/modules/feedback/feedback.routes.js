const express = require('express');
const { upload } = require('../../middleware/multer');
const { authenticate } = require('../../middleware/auth');
const controller = require('./feedback.controller');

const router = express.Router();

router.post(
  '/:willId',
  authenticate,
  upload.array('files', 5),
  controller.createFeedback
);


module.exports = router;

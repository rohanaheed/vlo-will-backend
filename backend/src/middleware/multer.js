const multer = require('multer')
const path = require('path')
const fs = require('fs')
const crypto = require('crypto')

const uploadPath = path.join(__dirname, '../uploads/feedback');

if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true });
}
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadPath)
  },
  filename: function (req, file, cb) {
    const unique = crypto.randomUUID()
    const ext = path.extname(file.originalname)
    cb(null, unique + ext)
  }
})

const fileFilter = (req, file, cb) => {
    const allowed = [
        'image/jpeg',
        'image/png',
        'application/pdf'
    ]
    if(!allowed.includes(file.mimetype)){
        return cb(new Error('Invalide File Type Only PNG, JPEG, PDF Allowed'))
    }
    cb(null, true)
}

const uploadFeedback = multer({
    storage,
    fileFilter,
    limits:{
        fileSize: 5 * 1024 * 1024,
        files: 5
    }
})

const upload = uploadFeedback

module.exports = { upload }
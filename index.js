const INPUT_NAME = 'image';
const UPLOAD_DIR = 'uploads';

const express = require('express');
const app = express();
const multer = require('multer');
const upload = multer({
    dest: UPLOAD_DIR,
    fileFilter: fileFilter,
    limits: { fileSize: 1024 * 1024 * 3 } // 3MB
});
const fs = require('fs');

app.use((err, req, res, next) => {
    if (err) {
        res.status(500).send('Oh no!');
    } else {
        next();
    }
});

app.get('/', (req, res) => {
    fs.readdir(UPLOAD_DIR, (err, files) => {
        const images = files.map(
            el =>
                `<a href="/${el}">
                    <img src="/${el}" style="object-fit: cover; height: 10em; width: 10em;" />
                </a>`
        );
        res.send(`<div>${images}</div>`);
    });
});

app.get('/upload', (req, res) => {
    res.send(
        `<form enctype="multipart/form-data" method="POST">
            <input type="file" name="${INPUT_NAME}"/>
            <input type="submit" value="Submit"/>
        </form>`
    );
});

app.get('/:filename', (req, res) => {
    const filepath = `./${UPLOAD_DIR}/${req.params.filename}`;
    fs.stat(filepath, (err, stats) => {
        if (err) {
            res.status(404).send('File not found.');
        } else {
            fs.createReadStream(filepath).pipe(res);
        }
    });
});

app.post('/upload', upload.single(INPUT_NAME), (req, res) => {
    if (req.file) {
        res.redirect(`/${req.file.filename}`);
    } else {
        res.status(400).send('Your file was rejected.');
    }
});

app.listen(3000, function() {
    console.log('app listening on port 3000!');
});

function fileFilter(req, file, callback) {
    if (file.mimetype && file.mimetype.indexOf('image/') !== -1) {
        callback(null, true);
    } else {
        callback(null, false);
    }
}

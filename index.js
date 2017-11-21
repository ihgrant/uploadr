const PORT = process.env.PORT || 3000;
const INPUT_NAME = "image";
const UPLOAD_DIR = "./uploads/";
const CLIENT_ID = process.env.CLIENT_ID || `http://localhost:${PORT}`;
const CALLBACK_URL = `${CLIENT_ID}/login/callback`;

const express = require("express");
const app = express();
const multer = require("multer");
const uuid = require("uuid");
const got = require("got");
const { parse } = require("query-string");
const StorageEngine = require("./storage-engine");
const upload = multer({
    // dest: UPLOAD_DIR,
    storage: StorageEngine({
        destination: function(req, file, cb) {
            const extension = last(file.originalname.split("."));

            if (extension !== file.originalname) {
                cb(null, UPLOAD_DIR + uuid.v4() + "." + extension);
            } else {
                cb(null, UPLOAD_DIR + uuid.v4());
            }
        }
    }),
    fileFilter: fileFilter,
    limits: { fileSize: 1024 * 1024 * 3 } // 3MB
});
const fs = require("fs");
const cookieSession = require("cookie-session");

app.use(
    cookieSession({
        name: "session",
        keys: ["secret"]
    })
);

app.use((err, req, res, next) => {
    if (err) {
        res.status(500).send("Oh no!");
    } else {
        next();
    }
});

app.get("/", (req, res) => {
    fs.readdir(UPLOAD_DIR, (err, files) => {
        const images = files
            .map(
                el =>
                    `<a href="/i/${el}"><img src="/i/${el}" style="object-fit: cover; height: 10em; width: 10em; padding: .25rem" /></a>`
            )
            .join("");
        res.send(`<div>${images}</div>`);
    });
});

app.get("/i/:filename", (req, res) => {
    const filepath = UPLOAD_DIR + req.params.filename;
    fs.stat(filepath, (err, stats) => {
        if (err) {
            res.status(404).send("File not found.");
        } else {
            fs.createReadStream(filepath).pipe(res);
        }
    });
});

app.get("/login", (req, res) => {
    if (req.session.me) {
        res.redirect("/upload");
    } else {
        res.send(
            `<form action="https://indieauth.com/auth" method="get">
                <label for="indie_auth_url">Web Address:</label>
                <input id="indie_auth_url" type="text" name="me" placeholder="yourdomain.com" />
                <p><button type="submit">Sign In</button></p>
                <input type="hidden" name="client_id" value="${CLIENT_ID}" />
                <input type="hidden" name="redirect_uri" value="${CALLBACK_URL}" />
            </form>`
        );
    }
});

app.get("/login/callback", (req, res) => {
    if (!req.query.code) {
        res.status(401).send("No auth code returned.");
    } else {
        got(`https://indieauth.com/auth`, {
            body: {
                code: req.query.code,
                client_id: CLIENT_ID,
                redirect_uri: CALLBACK_URL
            },
            form: true,
            method: "POST"
        })
            .then(response => {
                req.session.me = parse(response.body).me;
                res.redirect("/upload");
            })
            .catch(err => {
                res.status(401).send(err.message);
            });
    }
});

app.use((req, res, next) => {
    if (!req.session.me) {
        res.redirect("/login");
    } else {
        next();
    }
});

app
    .route("/upload")
    .get((req, res) => {
        res.send(
            `<form enctype="multipart/form-data" method="POST">
            <input type="file" required name="${INPUT_NAME}"/>
            <input type="submit" value="Submit"/>
        </form>`
        );
    })
    .post(upload.single(INPUT_NAME), (req, res) => {
        if (req.file) {
            console.log(req.file);
            res.redirect(last(req.file.path.split("/")));
        } else {
            res.status(400).send("Your file was rejected.");
        }
    });

app.listen(PORT, function() {
    console.log(`> app listening on port ${PORT}!`);
});

function fileFilter(req, file, callback) {
    if (file.mimetype && file.mimetype.indexOf("image/") !== -1) {
        callback(null, true);
    } else {
        callback(null, false);
    }
}

function last(array) {
    return array[array.length - 1];
}

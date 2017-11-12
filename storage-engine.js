const fs = require("fs");
const sharp = require("sharp");

function getDestination(req, file, cb) {
    cb(null, "/dev/null");
}

function StorageEngine(opts) {
    this.getDestination = opts.destination || getDestination;
}

StorageEngine.prototype._handleFile = function _handleFile(req, file, cb) {
    this.getDestination(req, file, function(err, path) {
        if (err) {
            return cb(err);
        }

        const outStream = fs.createWriteStream(path);
        outStream.on("error", cb);
        outStream.on("finish", function() {
            cb(null, {
                path: path,
                size: outStream.bytesWritten
            });
        });

        const transform = sharp()
            .rotate()
            .resize(1200)
            .on("error", cb);

        file.stream.pipe(transform).pipe(outStream);
    });
};

StorageEngine.prototype._removeFile = function _removeFile(req, file, cb) {
    fs.unlink(file.path, cb);
};

module.exports = function(opts) {
    return new StorageEngine(opts);
};

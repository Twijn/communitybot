const con = require("../internal/database");

let guilds = {};

const cache = {
    guild: {
        get: (id, callback) => {
            if (guilds.hasOwnProperty(id)) {
                callback(null, guilds[id]);
            }

            con.query("select * from guilds where id = ?;", [id], (err, result) => {
                if (err) {
                    callback(err, null);
                    return;
                }

                if (result.length > 0) {
                    guilds[id] = result[0];
                    callback(null, result[0]);
                } else {
                    callback("Guild was not found!", null);
                }
            });
        }
        , add: (id, url, prefix = "!") => {
            con.query("insert into guilds (id, url, prefix) values (?, ?, ?);", [id, url, prefix]);
        }
    }
}

module.exports = cache;
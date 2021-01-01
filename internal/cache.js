const con = require("./database");

// The purpose of this file was to automatically cache the data received from the SQL server,
// however currently it is just serving data directly from the database at all times.
//
// I'm worried this could adversely effect performance, hence the existence of this file.

const cache = {
    guild: {
        get: (id, callback) => {
            con.query("select * from guilds where id = ?;", [id], (err, result) => {
                if (err) {
                    callback(err, null);
                    return;
                }

                if (result.length > 0) {
                    callback(null, result[0]);
                } else {
                    callback("Guild was not found!", null);
                }
            });
        }
        , add: (id, url, prefix = "!") => {
            con.query("insert into guilds (id, url, prefix) values (?, ?, ?);", [id, url, prefix]);
        }
        , update: (id, values, callback) => {
            cache.guild.get(id, (err, guild) => {
                if (err) {console.log(err);callback(false, err);return;}

                let updateQuery = "";
                let params = [];

                for (const index in values) {
                    let value = values[index];

                    if (guild.hasOwnProperty(index) && index !== "id") {
                        guild[index] = value;

                        if (updateQuery !== "") {
                            updateQuery += ", ";
                        }
                        updateQuery += `${index} = ?`;

                        params = [
                            ...params
                            , value
                        ];
                    }
                }

                if (params.length > 0) { // make sure we actually have to update
                    params = [
                        ...params
                        , id
                    ];

                    con.query(`update guilds set ${updateQuery} where id = ?;`, params, err => {
                        if (err) {console.log(err);callback(false, err);return;}

                        callback(true);
                    });
                } else {
                    callback(true);
                }
            });
        }
        , queue: {
            reserved: {
                add: (guild_id, user_id) => {
                    con.query("insert into queue (user_id, guild_id, status) values (?, ?, 'reserved') on duplicate key update status = 'reserved';", [user_id, guild_id]);
                }
                , remove: (guild_id, user_id) => {
                    con.query("update queue set status = 'game' where guild_id = ? and user_id = ?;", [guild_id, user_id]);
                }
                , get: (guild_id, callback) => {
                    con.query("select * from queue where guild_id = ? and status = 'reserved';", [guild_id], (err, result) => {
                        if (err) {callback(err, null);return;}
        
                        let resultArray = [];
        
                        result.forEach(seat => {
                            resultArray = [
                                ...resultArray
                                , seat.user_id
                            ];
                        });
        
                        callback(null, resultArray);
                    });
                }
            }
        }
    }
}

module.exports = cache;
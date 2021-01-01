const con = require("./database");
const client = require("../discord/discord").client;

const Manager = {
    guild: {
        pretty: guild => {
            let gObj = guild.guild;
            
            return {
                id: guild.id,
                name: gObj.name,
                url: guild.url,
                seats: guild.seats,
                endAction: {
                    channel: guild.channel_action,
                    role: guild.role_action,
                },
            };
        },
        structurize: (guildRow, callback) => {
            client.guilds.fetch(guildRow.id).then(guild => {
                guildRow.guild = guild;
                callback(guildRow);
            });
        },
        getFromURL: (url, callback = () => {}) => {
            con.query("select * from guilds where url = ?;", [url], (err, guildRes) => {
                if (err) {
                    callback(null);
                    return;
                }

                if (guildRes.length > 0) {
                    Manager.guild.structurize(guildRes[0], callback);
                } else {
                    callback(null);
                }
            });
        },
    },
    queue: {
        getFromId: (id, callback = () => {}) => {
            con.query("select * from queue where guild_id = ? order by status_updated asc;", [id], async (err, queueRes) => {
                if (err) {
                    callback([]);
                    return;
                }

                if (queueRes.length > 0) {
                    let guild = await client.guilds.fetch(id);
                    let queue = [];

                    for (let queueRow of queueRes) {
                        queueRow.member = await guild.members.fetch(queueRow.user_id);

                        queueRow.member.displayAvatar = queueRow.member.user.displayAvatarURL();
                        queueRow.member.username = queueRow.member.user.username;
                        queueRow.member.discriminator = queueRow.member.user.discriminator;

                        queue = [
                            ...queue
                            , queueRow
                        ];
                    }

                    callback(queue);
                } else {
                    callback([]);
                }
            });
        }
    },
};

module.exports = Manager;
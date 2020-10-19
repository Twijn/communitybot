const cache = require("../internal/cache");
const con = require("../internal/database");

const command = {
    name: 'end'
    , description: 'End the current community games lobby'
    , usage: `end`
    , execute(message, args) {
        con.query("select * from channels as c where c.guild_id = ?;", [message.guild.id], (err, result) => {
            if (err) {console.log(err);return;}

            result.forEach(channelRow => {
                try {
                    message.guild.channels.cache.find(channel => channel.id === channelRow.id).delete();
                } catch (err) {
                    console.error(err);
                }
            });

            con.query("delete from channels where guild_id = ?;", [message.guild.id]);
        });

        con.query("select * from roles where guild_id = ?;", [message.guild.id], (err, result) => {
            if (err) {console.log(err);return;}

            result.forEach(roleRow => {
                try {
                    message.guild.roles.cache.find(role => role.id === roleRow.id).delete();
                } catch (err) {
                    console.error(err);
                }
            });

            con.query("delete from roles where guild_id = ?;", [message.guild.id]);
        });

        con.query("delete from queue where guild_id = ?;", [message.guild.id]);

        message.reply("Community game time ended!");
    }
};

module.exports = command;
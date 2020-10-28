const cache = require("../../internal/cache");
const con = require("../../internal/database");


const findRole = (guild, name, callback = () => {}) => {
    con.query("select id from roles where name = ? and guild_id = ?;", [name, guild.id], (err, result) => {
        if (err) {console.error(err);return;}

        if (result.length > 0) {
            let roleId = result[0].id;
            let role = guild.roles.cache.find(role => role.id === roleId);

            callback(role);
        }
    });
}

const command = {
    name: 'end'
    , description: 'End the current community games lobby'
    , usage: `end`
    , permission: 'MANAGE_CHANNELS'
    , execute(message, args) {
        con.query("select c.id, g.channel_action as action from channels as c join guilds as g on g.id = c.guild_id where c.guild_id = ? and g.channel_action = 'delete' or  g.channel_action = 'hide';", [message.guild.id], (err, result) => {
            if (err) {console.log(err);return;}

            result.forEach(channelRow => {
                try {
                    if (channelRow.action === "delete") {
                        message.guild.channels.cache.find(channel => channel.id === channelRow.id).delete()
                        con.query("delete from channels where id = ?;", [channelRow.id]);
                    }

                    if (channelRow.action === 'hide') {
                        //hide
                    }
                } catch (err) {
                    console.error(err);
                }
            });
        });

        con.query("select r.id, g.role_action as action from roles as r join guilds as g on g.id = r.guild_id where r.guild_id = ? and g.role_action = 'delete';", [message.guild.id], (err, result) => {
            if (err) {console.log(err);return;}

            result.forEach(roleRow => {
                try {
                    message.guild.roles.cache.find(role => role.id === roleRow.id).delete();
                    con.query("delete from roles where id = ?;", [roleRow.id]);
                } catch (err) {
                    console.error(err);
                }
            });
        });

        con.query("delete from queue where guild_id = ?;", [message.guild.id]);

        con.query("update guilds set seats = null where id = ?;", [message.guild.id]);

        findRole(message.guild, "In Queue", inQueueRole => {
            findRole(message.guild, "In Game", inGameRole => {
                message.guild.members.cache.each(member => {
                    if (member.roles.cache.has(inQueueRole.id)) {
                        member.roles.remove(inQueueRole);
                    }
                    if (member.roles.cache.has(inGameRole.id)) {
                        member.roles.remove(inGameRole);
                    }
                });
            });
        });

        message.reply("Community game time ended!");
    }
};

module.exports = command;
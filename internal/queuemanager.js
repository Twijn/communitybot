const con = require("../internal/database");
const Discord = require("discord.js");

const findOrCreateRole = (guild, data, callback = () => {}) => {
    con.query("select id from roles where name = ? and guild_id = ?;", [data.data.name, guild.id], async (err, result) => {
        if (err) {console.error(err);return;}

        if (result.length > 0) {
            let roleId = result[0].id;
            let role = guild.roles.cache.find(role => role.id === roleId);

            if (!role) {
                con.query("delete from roles where id = ?;", [roleId]);

                // create new channel
                role = await guild.roles.create(data);
                addRoleToDatabase(role);
            }
            
            callback(role);
        } else {
            // create new channel
            let role = await guild.roles.create(data);
            addRoleToDatabase(role);
            callback(role);
        }
    });
}

const findChannel = (guild, name, callback = () => {}) => {
    con.query("select id from channels where name = ? and guild_id = ?;", [name, guild.id], (err, result) => {
        if (err) {console.error(err);return;}

        if (result.length > 0) {
            let channelId = result[0].id;
            let channel = guild.channels.cache.find(channel => channel.id === channelId);

            callback(channel);
        }
    });
}

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

const qm = {
    autoAdd: (guild, num_players = 100, callback = () => {}) => {
        con.query("SELECT guilds.seats from guilds where id = ?;", [guild.id], (err, guildResults) => {
            if (err) {callback(err, null);console.error(err);return;}

            if (guildResults.length > 0) {
                con.query("SELECT * from queue where (status = 'game' or status = 'reserved') and guild_id = ?;", [guild.id], (err, inGame) => {
                    if (err) {message.reply("An error occurred.");console.error(err);return;}
        
                    let fillAmount = Math.min(num_players, guildResults[0].seats - inGame.length);

                    con.query("SELECT * from queue where status = 'queue' and guild_id = ? order by status_updated asc limit ?;", [guild.id, fillAmount], (err, queueSet) => {
                        if (err) {message.reply("An error occurred.");console.error(err);return;}
        
                        let members = [];
                        queueSet.forEach(queueItem => {
                            let member = guild.member(queueItem.user_id);
                            members = [
                                ...members
                                , member
                            ]
                            qm.addPlayerToGame(guild, member);
                        });
                        callback(null, members);
                    });
                });
            } else {
                callback("Failed to get current guild", null);
            }
        });
    },
    addPlayerToGame: (guild, user) => {
        con.query("update queue set status = 'game' where user_id = ? and guild_id = ? and status = 'queue';", [user.id, guild.id]);

        findOrCreateRole(guild, {data: {
            name: 'In Queue',
        }}, inQueueRole => {
            if (user.roles.cache.find(role => role.id === inQueueRole.id)) {
                user.roles.remove(inQueueRole);
            }
        });

        findOrCreateRole(guild, {data: {
            name: 'In Game',
        }}, inGameRole => {
            if (!user.roles.cache.find(role => role.id === inGameRole.id)) {
                console.log("adding in game role(1)");
                user.roles.add(inGameRole);
            }
        });

        findChannel(guild, "Game Time!", gameTimeChannel => {
            user.voice.setChannel(gameTimeChannel);
        });
    },
    addPlayerToQueue: (guild, user) => {
        findRole(guild, "In Queue", inQueueRole => {
            findRole(guild, "In Game", inGameRole => {
                if (!user.roles.cache.find(role => role.id === inGameRole.id) && !user.roles.cache.find(role => role.id === inQueueRole.id)) {
                    user.roles.add(inQueueRole);

                    const joinMessage = new Discord.MessageEmbed()
                        .setColor('#0099ff')
                        .setTitle('Joined Queue!')
                        .setDescription(`You joined the community game queue in \`${guild.name}\``)
                        .addFields(
                            { name: 'Leaving the Channel', value: `\`\`\`Leaving the voice queue will\nstill keep you in the game queue.\n\nYou will receive a message\nwhen you are next in queue,\nand will have 10 seconds to join.\n\`\`\``, inline: true},
                            { name: 'Leaving the Queue', value: `\`\`\`In order to leave the queue,\njoin the Leave Queue channel.\n\nAlternatively, you can also type !leave in an appropriate text channel.\`\`\``, inline: true},
                        );

                    user.send(joinMessage);
                    

                    try {
                        con.query("insert into queue (user_id, guild_id) values (?, ?);", [user.id, guild.id]);
                    } catch(err) {
                        console.error(err);
                    }
                }
            });
        });
    }
}

module.exports = qm;
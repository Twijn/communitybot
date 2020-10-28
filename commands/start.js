const Discord = require("discord.js");
const cache = require("../internal/cache");
const con = require("../internal/database");

const addChannelToDatabase = channel => {
    con.query("insert into channels (id, guild_id, name) values (?, ?, ?);", [channel.id, channel.guild.id, channel.name]);
}

const addRoleToDatabase = role => {
    con.query("insert into roles (id, guild_id, name) values (?, ?, ?);", [role.id, role.guild.id, role.name]);
}

const findOrCreateChannel = (guild, name, data, callback = () => {}) => {
    con.query("select id from channels where name = ? and guild_id = ?;", [name, guild.id], async (err, result) => {
        if (err) {console.error(err);return;}

        if (result.length > 0) {
            let channelId = result[0].id;
            let channel = guild.channels.cache.find(channel => channel.id === channelId);

            if (!channel) {
                con.query("delete from channels where id = ?;", [channelId]);

                // create new channel
                channel = await guild.channels.create(name, data);
                addChannelToDatabase(channel);
            }
            
            callback(channel);
        } else {
            // create new channel
            let channel = await guild.channels.create(name, data);
            addChannelToDatabase(channel);
            callback(channel);
        }
    });
}

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

function getUserFromMention(guild, mention) {
	if (!mention) return;

	if (mention.startsWith('<@') && mention.endsWith('>')) {
		mention = mention.slice(2, -1);

		if (mention.startsWith('!')) {
			mention = mention.slice(1);
		}

		return guild.members.cache.get(mention);
	}
}

const command = {
    name: 'start'
    , description: 'Start a new community games lobby'
    , usage: `start <Total slots> [Reserved slot mentions]`
    , permission: 'MANAGE_CHANNELS'
    , execute(message, args) {
        let guild = message.guild;

        con.query("select seats, url from guilds where id = ?;", [guild.id], (err, results) => {
            if (err) {console.error(err);message.reply("An error occurred!");return;}

            if (!results || results.length < 1 || results[0].seats === null) {
                let seats = null;
                let reserved = [];

                let url = null;

                if (results && results.length > 0)
                    url = results[0].url;
        
                args.forEach(arg => {
                    if (!isNaN(parseInt(arg))) {
                        seats = parseInt(arg);
                    } else if (arg.startsWith("<@") && arg.endsWith(">") && !arg.startsWith("<@&")) {
                        let reservedUser = getUserFromMention(message.guild, arg);
                        
                        findOrCreateRole(guild, {data: {
                            name: 'In Queue',
                        }}, inQueueRole => {
                            if (reservedUser.roles.cache.find(role => role.id === inQueueRole.id)) {
                                reservedUser.roles.remove(inQueueRole);
                            }
                        });

                        findOrCreateRole(guild, {data: {
                            name: 'In Game',
                        }}, inGameRole => {
                            if (!reservedUser.roles.cache.find(role => role.id === inGameRole.id)) {
                                console.log("adding in game role(2)");
                                reservedUser.roles.add(inGameRole);
                            }
                        });

                        reserved = [
                            ...reserved
                            , reservedUser
                        ];
                    }
                });
        
                if (seats === null) {
                    message.reply("Missing parameter for total slots");
                    return;
                } if (seats < 1 || seats > 100) {
                    message.reply("Total slots must be over 0 and at or under 100");
                    return;
                }
        
                con.query("update guilds set seats = ? where id = ?;", [seats, guild.id]);
        
                con.query("delete from queue where guild_id = ?;", [guild.id], () => {
                    reserved.forEach(reservedUser => {
                        con.query("insert into queue (user_id, guild_id, status) values (?, ?, 'reserved');", [reservedUser.id, guild.id]);
                    })
                });
        
                let everyoneRole = guild.roles.cache.find(role => role.name === "@everyone");
        
                // create/load base category
                findOrCreateChannel(guild, "Community Games!", {type: 'category'}, category => {
                    // create/load roles
                    findOrCreateRole(guild, {
                        data: {
                            name: 'In Game',
                        },
                    }, inGameRole => {
                        findOrCreateRole(guild, {
                            data: {
                                name: 'In Queue',
                            },
                        }, inQueueRole => {
                            // create/load voice channels
                            findOrCreateChannel(guild, "Queue", {
                                type: 'voice',
                                parent: category,
                            }, async queue => {
                                let invite = await queue.createInvite({
                                    maxAge: 0, // 0 = infinite expiration
                                    maxUses: 0 // 0 = infinite uses
                                }).catch(console.error);
        
                                let reservedList = "";
        
                                reserved.forEach(member => {
                                    if (reservedList !== "") reservedList += "\n";
                                    reservedList += member.displayName;
                                });
                                const announceEmbed = new Discord.MessageEmbed()
                                    .setColor('#0099ff')
                                    .setTitle('Community Games Started!')
                                    .addFields(
                                        { name: 'Total Seats', value: `\`\`\`${seats} total seats\n${reserved.length} reserved\n${seats - reserved.length} community seats\`\`\``, inline: true},
                                        { name: 'Reserved Members', value: reservedList === "" ? "```No reserved members!```" : "```\n" + reservedList + "```", inline: true},
                                        { name: 'Join the Queue channel to join!', value: invite},
                                    );

                                if (url !== null) {
                                    announceEmbed.setURL("https://communitybot.games/" + url);
                                    announceEmbed.addField("Web View", "https://communitybot.games/" + url);
                                }

                                message.channel.send(announceEmbed);
                            });
                            findOrCreateChannel(guild, "Silent Queue", {
                                type: 'voice',
                                parent: category,
                                permissionOverwrites: [
                                    {
                                        id: everyoneRole.id,
                                        deny: ['SPEAK'],
                                    },
                                ],
                            });
                            findOrCreateChannel(guild, "Game Time!", {
                                type: 'voice',
                                parent: category,
                                permissionOverwrites: [
                                    {
                                        id: message.bot_id,
                                        allow: ['CONNECT'],
                                    },
                                    {
                                        id: inGameRole,
                                        allow: ['CONNECT'],
                                    },
                                    {
                                        id: everyoneRole.id,
                                        deny: ['CONNECT'],
                                    },
                                ],
                            }, channel => {
                                channel.setUserLimit(seats);
                            });
                            findOrCreateChannel(guild, "Exit Game / Leave Queue", {
                                type: 'voice',
                                parent: category,
                            });
                        });
                    });
                });
            } else {
                message.reply("Community game is still live! Use `!end` to end it before starting another. Use `!reserved` or `!seats` to change the current settings.");
            }
        });
    }
};

module.exports = command;
const fs = require('fs');
const Discord = require("discord.js");
const client = new Discord.Client();

client.commands = new Discord.Collection();

const config = require("../config.json");
const con = require("../internal/database");
const cache = require("../internal/cache");
const qm = require("../internal/queuemanager");

const commandFiles = fs.readdirSync('./discord/commands').filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    client.commands.set(command.name, command);
}

client.once('ready', () => {
    console.log(`Discord bot ready! Logged in as ${client.user.tag}!`);
    console.log(`Bot has started with ${client.users.cache.size} users, in ${client.channels.cache.size} channels of ${client.guilds.cache.size} guilds.`);
});

// implement commands
client.on('message', message => {
    message.bot_id = client.user.id;

    if (message.channel.guild === null || message.channel.guild === undefined) return;

    cache.guild.get(message.channel.guild.id, (err, guild) => {
        let prefix = "!";
        
        if (err) {
            if (err == "Guild was not found!") {
                console.log("Guild not found. adding");
                let name = message.channel.guild.name;
                name = name.toLowerCase().replace(/ /g, "-").replace(/[^a-z-]/g);
                cache.guild.add(message.channel.guild.id, name);
            } else {
                console.error(err);
                return;
            }
        } else {
            prefix = guild.prefix;
        }

        if (!message.content.startsWith(prefix) || message.author.bot) return;

        const args = message.content.slice(prefix.length).trim().split(/ +/);
        const command = args.shift().toLowerCase();
        
    
        if (!client.commands.has(command)) return;

        let cmd = client.commands.get(command);
        
        if (!cmd.hasOwnProperty("permission") || message.guild.member(message.author.id).hasPermission(cmd.permission)) {
            try {
                cmd.execute(message, args);
            } catch (error) {
                console.error(error);
                message.reply('There was an error trying to execute that command!');
            }
        } else {
            message.reply(`Insufficient permission! You need \`${cmd.permission}\``);
        }
    });
});

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

client.on("voiceStateUpdate", (oldState, newState) => {
    if (oldState.channelID !== newState.channelID) {
        let user = newState.guild.member(newState.id);

        let fromChannel = oldState.guild.channels.cache.find(channel => channel.id === oldState.channelID);
        let toChannel = newState.guild.channels.cache.find(channel => channel.id === newState.channelID);

        let guild = newState.guild;
        
        if (!fromChannel || !toChannel || fromChannel.id !== toChannel.id) {
            const processChannelQueue = channel => {
                if (toChannel && channel.id === toChannel.id) {
                    qm.addPlayerToQueue(guild, user);
                }
            }

            findChannel(guild, "Queue", processChannelQueue);
            findChannel(guild, "Silent Queue", processChannelQueue);

            const processChannelLeave = channel => {
                if (toChannel && channel.id === toChannel.id) {
                    findRole(guild, "In Queue", inQueueRole => {
                        if (user.roles.cache.find(role => role.id === inQueueRole.id)) {
                            user.roles.remove(inQueueRole);

                            const leaveQueue = new Discord.MessageEmbed()
                                .setColor('#0099ff')
                                .setTitle('Left Queue!')
                                .setDescription(`You left the community game queue in \`${guild.name}\``);

                            user.send(leaveQueue);
                        }
                    });
                    findRole(guild, "In Game", inGameRole => {
                        if (user.roles.cache.find(role => role.id === inGameRole.id)) {
                            user.roles.remove(inGameRole);
                            
                            const leaveQueue = new Discord.MessageEmbed()
                                .setColor('#0099ff')
                                .setTitle('Left Game!')
                                .setDescription(`You left the community game in \`${guild.name}\``);

                            user.send(leaveQueue);
                        }
                    });
                    
                    user.voice.setChannel(null);

                    con.query("delete from queue where user_id = ? and guild_id = ?;", [user.id, guild.id]);
                }
            }

            findChannel(guild, "Exit Game / Leave Queue", processChannelLeave);
        } else {

        }
    }
});

console.log("Logging in...");
client.login(config.token);
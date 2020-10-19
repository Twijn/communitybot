const fs = require('fs');
const Discord = require("discord.js");
const client = new Discord.Client();

client.commands = new Discord.Collection();

const config = require("./config.json");
const con = require("./internal/database");
const cache = require("./internal/cache");

const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    client.commands.set(command.name, command);
}

client.once('ready', () => {
    console.log(`I am ready! Logged in as ${client.user.tag}!`);
	console.log(`Bot has started, with ${client.users.cache.size} users, in ${client.channels.cache.size} channels of ${client.guilds.cache.size} guilds.`); 
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
    
        try {
            client.commands.get(command).execute(message, args);
        } catch (error) {
            console.error(error);
            message.reply('There was an error trying to execute that command!');
        }
    });
});

client.on("voiceStateUpdate", (oldState, newState) => {
    if (oldState.channelID !== newState.channelID) {
        
    }
});

client.login(config.token);
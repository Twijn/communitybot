const cache = require("../internal/cache");
const con = require("../internal/database");

const addChannelToDatabase = channel => {
    con.query("insert into channels (id, guild_id, name) values (?, ?, ?);", [channel.id, channel.guild.id, channel.name]);
}

const addRoleToDatabase = role => {
    con.query("insert into roles (id, guild_id, name) values (?, ?, ?);", [role.id, role.guild.id, role.name]);
}

const command = {
    name: 'start'
    , description: 'Start a new community games lobby'
    , usage: `start [Total seats] [Reserved seat mentions]`
    , async execute(message, args) {
        let guild = message.guild;

        let everyoneRole = guild.roles.cache.find(role => role.name === "@everyone");

        // create community games category
        let category = await guild.channels.create('Community Games!', {
            type: 'category',
        })
        addChannelToDatabase(category);

        // add in game/in queue role
        let inGameRole = await guild.roles.create({
            data: {
                name: 'In Game',
            },
        })
        addRoleToDatabase(inGameRole);
        
        let inQueueRole = await guild.roles.create({
            data: {
                name: 'In Queue',
            },
        })
        addRoleToDatabase(inQueueRole);

        // add voice channels
        let queue = await guild.channels.create('Queue', {
            type: 'voice',
            parent: category,
        });
        addChannelToDatabase(queue);

        guild.channels.create('Silent Queue', {
            type: 'voice',
            parent: category,
            permissionOverwrites: [
                {
                    id: everyoneRole.id,
                    deny: ['SPEAK'],
                },
            ],
        }).then(addChannelToDatabase);

        guild.channels.create('Game Time!', {
            type: 'voice',
            parent: category,
            permissionOverwrites: [
                {
                    id: message.bot_id,
                    allow: ['CONNECT'],
                },
                {
                    id: everyoneRole.id,
                    deny: ['CONNECT'],
                },
            ],
        }).then(addChannelToDatabase);

        guild.channels.create('Exit Game / Leave Queue', {
            type: 'voice',
            parent: category,
            permissionOverwrites: [
                {
                    id: message.bot_id,
                    allow: ['VIEW_CHANNEL', 'SPEAK'],
                },
                {
                    id: inGameRole,
                    allow: ['VIEW_CHANNEL'],
                },
                {
                    id: everyoneRole.id,
                    deny: ['VIEW_CHANNEL', 'SPEAK'],
                },
            ],
        }).then(addChannelToDatabase);

        // create invite

        let invite = await queue.createInvite({
            maxAge: 0, // 0 = infinite expiration
            maxUses: 0 // 0 = infinite uses
        }).catch(console.error);

        // send message
        message.reply(`Community games started! Join the queue channel to join the queue. ${invite}`);
    }
};

module.exports = command;
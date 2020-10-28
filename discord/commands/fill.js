const qm = require("../../internal/queuemanager");
const con = require("../../internal/database");
const Discord = require("discord.js");

const command = {
    name: 'fill'
    , description: 'Fill the game with the next people in the queue'
    , permission: 'MANAGE_CHANNELS'
    , usage: `fill`
    , execute(message, args) {
        qm.autoAdd(message.guild, 100, (err, members) => {
            if (err) {message.reply(err);console.error(err);return;}

            
        });
    }
};

module.exports = command;
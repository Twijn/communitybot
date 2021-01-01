const qm = require("../../internal/queuemanager");
const con = require("../../internal/database");
const Discord = require("discord.js");

const command = {
    name: 'fill'
    , description: 'Fill the game with the next people in the queue'
    , permission: 'MANAGE_CHANNELS'
    , usage: `fill`
    , execute(message, args) {
        let fillAmount = 100;

        if (fillAmount.length > 0 && !isNaN(parseInt(args[0]))) {
            fillTo = parseInt(args[0]);
        }

        qm.autoAdd(message.guild, fillAmount, (err, members) => {
            if (err) {message.reply("An error occurred.");console.error(err);return;}

            let addedMembersString = "";
            let waitingMembersString = "";

            let addedMembers = [];
            let waitingMembers = [];

            members.forEach(member => {
                if (member.voice.channelID === null || member.voice.channelID === undefined) {
                    if (waitingMembersString !== "") {
                        waitingMembersString += "\n";
                    }
                    waitingMembersString += member.displayName;

                    waitingMembers = [
                        ...waitingMembers
                        , member
                    ];
                } else {
                    if (addedMembersString !== "") {
                        addedMembersString += "\n";
                    }
                    addedMembersString += member.displayName;

                    addedMembers = [
                        ...addedMembers
                        , member
                    ];
                }
            });

            if (members.length > 0) {
                const addedMessage = new Discord.MessageEmbed()
                    .setColor('#0099ff')
                    .setTitle(`${members.length} player${members.length === 1 ? ' was' : 's were'} added into the game!`)
                    .addFields(
                        {name: "Added Immediately", value: `\`\`\`\n${addedMembers.length === 0 ? 'No players added immediately' : addedMembersString}\`\`\``, inline: true},
                        {name: "Waiting for Move", value: `\`\`\`\n${waitingMembers.length === 0 ? 'No players are waiting' : waitingMembersString}\`\`\``, inline: true},
                    );

                message.channel.send(addedMessage);
            } else {
                const addedMessage = new Discord.MessageEmbed()
                    .setColor('#0099ff')
                    .setTitle(`No players were added.`)
                    .setDescription("The lobby may be full, or there may be no one in the queue. :(");

                message.channel.send(addedMessage);
            }
        });
    }
};

module.exports = command;
const cache = require("../../internal/cache");

let allowedProperties = ["url", "twitch_username", "prefix", "channel_action", "role_action"];

const command = {
    name: 'setting'
    , description: 'View/set settings for the server'
    , usage: `setting [Node] [Value]`
    , permission: 'MANAGE_CHANNELS'
    , async execute(message, args) {
        if (message.hasOwnProperty("cbguild") && message.cbguild !== null) {
            if (args.length > 1) {
                args[0] = args[0].toLowerCase();
                
                if (allowedProperties.includes(args[0])) {
                    let object = {};
                    object[args[0]] = args[1];

                    message.cbguild.edit(object).then(() => {
                        message.reply(`Value for \`${args[0]}\` set to \`${args[1]}\``);
                    }).catch(error => {
                        message.reply(`We encountered an error! ${error}`);
                    });
                } else {
                    message.reply(`Property \`${args[0]}\` was not found or can't be changed in this manner.`);
                }
            } else if (args.length > 0) {
                args[0] = args[0].toLowerCase();

                if (message.cbguild.hasOwnProperty(args[0]) && allowedProperties.includes(args[0])) {
                    message.reply(`Value for \`${args[0]}\`: \`${message.cbguild[args[0]]}\``);
                } else {
                    message.reply(`Property \`${args[0]}\` was not found or can't be viewed in this manner.`);
                }
            } else {
                let result = "**Current Settings:**```";

                let test = await message.cbguild.queue();console.log(test);

                allowedProperties.forEach(property => {
                    result += `\n${property}: ${message.cbguild.hasOwnProperty(property) ? message.cbguild[property] : 'unset'}`;
                });

                message.reply(result + "```");
            }
        } else {
            message.reply("Unable to find guild information!");
        }
    }
};

module.exports = command;
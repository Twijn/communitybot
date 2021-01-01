const cache = require("../../internal/cache");

const command = {
    name: 'setprefix'
    , description: 'Set the prefix for the current server'
    , usage: `setprefix <Prefix>`
    , permission: 'MANAGE_CHANNELS'
    , execute(message, args) {
        cache.guild.get(message.guild.id, (err, guild) => {
            if (args.length > 0) {
                if (args[0].length <= 4) {
                    message.cbguild.edit({prefix: args[0]}).then(() => {
                        message.reply(`CommunityBot prefix set to \`${args[0]}\``);
                    }).catch(error => {
                        message.reply(`We encountered an error! ${error}`);
                    });
                } else {
                    message.reply(`Prefix must be 4 characters or less in length!`);
                }
            } else {
                message.reply(`Invalid arguments! \`${(guild === undefined || guild === null ? '!' : guild.prefix) + command.usage.replace("{{prefix}}")}\``);
            }
        });
    }
};

module.exports = command;
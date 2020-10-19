const cache = require("../internal/cache");

const command = {
    name: 'setprefix'
    , description: 'Set the prefix for the current server'
    , usage: `setprefix <Prefix>`
    , execute(message, args) {
        cache.guild.get(message.guild.id, (err, guild) => {
            if (args.length > 0) {
                if (args[0].length <= 4) {
                    cache.guild.update(guild.id, {prefix: args[0].toLowerCase()}, (success, err) => {
                        if (success) {
                            message.reply(`CommunityBot prefix set to \`${args[0].toLowerCase()}\``)
                        } else {
                            message.reply(`An error occurred! ${err}`);
                        }
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
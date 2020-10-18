const command = {
    name: 'setprefix'
    , description: 'Set the prefix for the current server'
    , usage: `{{prefix}}setprefix <Prefix>`
    , execute(message, args) {
        if (args.length > 0) {
            if (args[0].length <= 2) {

            } else {
                message.channel.send(`<@${message.author.id}> Prefix must be 2 characters or less in length!`);
            }
        } else {
            message.channel.send(`<@${message.author.id}> Invalid arguments! \`${command.usage.replace("{{prefix}}", message.guild.prefix === undefined ? '!' : message.guild.prefix)}\``);
        }
    }
};

module.exports = command;
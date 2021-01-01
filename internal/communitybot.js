const con = require("./database");
const Discord = require("discord.js");
const cbDiscord = require("../discord/discord");

const editRules = {
    GUILD: {
        url: {
            min: 3,
            max: 32,
            regex: /^[\w-]+$/,
        },
        twitch_username: {
            min: 1,
            max: 25,
        },
        prefix: {
            min: 1,
            max: 4
        },
        seats: {
            type: "number",
            min: 1,
            max: 99
        },
        channel_action: {
            values: ["keep", "delete", "hide"],
        },
        role_action: {
            values: ["keep", "delete"],
        },
    },
    USER: {
        status: {
            values: ["game", "queue", "reserved", "waiting"],
        },
        update_timestamp: {
            values: [true, false],
        },
    },
};

const validate = (values, rules) => {
    let result = [true, []];

    for (const [key, value] of Object.entries(values)) {
        if (rules.hasOwnProperty(key)) {
            let rule = rules[key];
            let number = rule.hasOwnProperty("type") && rule.type === "number";

            if (rule.hasOwnProperty("regex") && !value.match(rule.regex)) {
                result[0] = false;
                result[1].push(`Property \`${key}\` does not match regex: \`${rule.regex}\``);
                continue;
            }

            if (rule.hasOwnProperty("min")) {
                if (number) {
                    if (value < rule.min) {
                        result[0] = false;
                        result[1].push(`Property \`${key}\` must be at least ${rule.min}`);
                        continue;
                    }
                } else {
                    if (value.length < rule.min) {
                        result[0] = false;
                        result[1].push(`Property \`${key}\` requires at least ${rule.min} character${rule.min === 1 ? '' : 's'}`);
                        continue;
                    }
                }
            }

            if (rule.hasOwnProperty("max")) {
                if (number) {
                    if (value > rule.max) {
                        result[0] = false;
                        result[1].push(`Property \`${key}\` must be under or equal to ${rule.max}`);
                        continue;
                    }
                } else {
                    if (value.length > rule.max) {
                        result[0] = false;
                        result[1].push(`Property \`${key}\` must be under or equal to ${rule.max} character${rule.max === 1 ? '' : 's'}`);
                        continue;
                    }
                }
            }

            if (rule.hasOwnProperty("values")) {
                if (!rule.values.includes(value.toLowerCase())) {
                    result[0] = false;
                    result[1].push(`Property \`${key}\` must be one of the values: ${rule.values}`);
                    continue;
                }
            }

        } else {
            result[0] = false;
            result[1].push(`Invalid property: \`${key}\``);
        }
    }

    return result;
};

const messages = {
    sendAddReserved: (user, guild) => {
        const notifyEmbed = new Discord.MessageEmbed()
            .setColor('#0099ff')
            .setTitle('You\'ve been added as a reserved community game member!')
            .setDescription(`You've been added as a reserved community game user in \`${guild.name}\`. [Click here to join!](${invite})`);

            user.send(notifyEmbed);
    },
    sendAddQueue: (user) => {
        const joinMessage = new Discord.MessageEmbed()
            .setColor('#0099ff')
            .setTitle('Joined Queue!')
            .setDescription(`You joined the community game queue in \`${guild.name}\``)
            .addFields(
                { name: 'Leaving the Channel', value: `\`\`\`Leaving the voice queue will\nstill keep you in the game queue.\n\nYou will receive a message\nwhen you are next in queue,\nand will have 10 seconds to join.\n\`\`\``, inline: true},
                { name: 'Leaving the Queue', value: `\`\`\`In order to leave the queue,\njoin the Leave Queue channel.\n\nAlternatively, you can also type !leave in an appropriate text channel.\`\`\``, inline: true},
            );

        user.send(joinMessage);
    }
};

class Guild {
    constructor(discord, url, twitch_username, prefix, seats, channel_action, role_action) {
        this.discord = discord;
        this.url = url;
        this.twitch_username = twitch_username;
        this.prefix = prefix;
        this.seats = seats;
        this.channel_action = channel_action;
        this.role_action = role_action;
    }

    edit(data) {
        return new Promise((resolve, reject) => {
            let validateData = validate(data, editRules.GUILD);

            if (validateData[0]) {
                let updateClause = "";
                let updateArray = [];

                for (const [key, value] of Object.entries(data)) {
                    if (updateClause !== "") {
                        updateClause += ", ";
                    }
                    updateClause += key + " = ?";
                    updateArray.push(value);
                }

                con.query(`update guilds set ${updateClause} where id = ?;`, [...updateArray, this.discord.id], (err) => {
                    if (err) reject(err);

                    for (const [key, value] of Object.entries(data)) {
                        this[key] = value;
                    }

                    resolve(data);
                });
            } else {
                reject(validateData[1]);
            }
        });
    }

    queue(data = null) {
        return new Promise(async (resolve, reject) => {
            if (data === null) {

                // get queue \\
                con.query("select user_id, status, status_updated from queue where guild_id = ?;", [this.discord.id], async (err, data) => {
                    if (err) {reject(err);return;}

                    let result = [];

                    for (let i = 0; i < data.length; i++) {
                        let row = data[i];

                        result = [
                            ...result
                            , {
                                user: await this.discord.members.fetch(row.user_id),
                                status: row.status,
                                updated: row.status_updated,
                            }
                        ];
                    }

                    resolve(result);
                });
            } else {
                if (typeof(data) === "object") {
    
                    // update queue \\
                    let currentQueueState = await this.queue();

                    let errors = [];

                    const processSingle = procUser => {
                        if (procUser.hasOwnProperty("id")) {
                            let currentUserState = currentQueueState.filter(queueUser => queueUser.user.user.id === procUser.id)[0];
                            
                            if (currentUserState === undefined || currentUserState === null) {
                                if (procUser.hasOwnProperty("status")) {
                                    delete procUser.id;

                                    let validation = validate(procUser, editRules.USER);

                                    if (validation[0]) {
                                        con.query("insert into queue (user_id, guild_id, status) values (?, ?, ?);", [procUser.id, this.discord.id, procUser.status], (err, data) => {
                                            if (err) {errors = [...errors, err];return;}
                                        });
                                    } else {
                                        errors = [
                                            ...errors,
                                            `Validation error on user ID \`${procUser.id}\`: ${validation[1]}`
                                        ];
                                    }
                                } else { // potentially replace this by adding "queue" as the default status.
                                    errors = [
                                        ...errors,
                                        `Status for user \`${procUser.id}\` is required in order to add to queue`
                                    ];
                                }
                            } else {
                                
                            }
                        }
                    }

                    if (Array.isArray(data)) {
                        data.forEach(processSingle);
                    } else {
                        processSingle(data);
                    }

                    if (errors.length === 0) {
                        
                    } else {
                        reject(`Errors: ${errors.join(', ')}`);
                    }
                } else {
                    reject("Parameter 'data' must be an array or object");
                }
            }
        });
    }
}

const get = {
    async guild(id, guild = null) {
        if (guild === null) {
            guild = await cbDiscord.client.guilds.fetch(id);
        }

        const guildData = await con.pquery("select url, twitch_username, prefix, seats, channel_action, role_action from guilds where id = ?;", [id]);
        
        if (guildData === null || guildData.length === 0) return null;

        let guildRow = guildData[0];
        
        return new Guild(guild, guildRow.url, guildRow.twitch_username, guildRow.prefix, guildRow.seats, guildRow.channel_action, guildRow.role_action);
    },
}

const inject = async message => {
    if (message.guild !== null) {
        message.cbguild = await get.guild(message.guild.id, message.guild);
        message.cbguild.queue({id: '532074992527998987', status: "queue"});
    }
}

module.exports.Guild = Guild;

module.exports.get = get;
module.exports.inject = inject;
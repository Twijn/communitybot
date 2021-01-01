const TwitchBot = require("twitch-bot");
const config = require("../config.json");

const Bot = new TwitchBot({
    username: config.twitch.username,
    oauth: config.twitch.oauth,
    channels: config.twitch.channels,
})

Bot.on('join', channel => {
    console.log(`Joined channel: ${channel}`);
})

Bot.on('error', err => {
    console.error(err);
})

Bot.on('message', chatter => {
    if (chatter.message === "!test") {
        Bot.say("Command executed! PogChamp");
    }
})
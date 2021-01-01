const WebSocket = require('ws');
const Manager = require('../internal/manager');

const wss = new WebSocket.Server({
    port: 8080,
    perMessageDeflate: {
        zlibDeflateOptions: {
            // See zlib defaults.
            chunkSize: 1024,
            memLevel: 7,
            level: 3
        },
        zlibInflateOptions: {
            chunkSize: 10 * 1024
        },
        // Other options settable:
        clientNoContextTakeover: true, // Defaults to negotiated value.
        serverNoContextTakeover: true, // Defaults to negotiated value.
        serverMaxWindowBits: 10, // Defaults to negotiated value.
        // Below options specified as default values.
        concurrencyLimit: 10, // Limits zlib concurrency for perf.
        threshold: 1024 // Size (in bytes) below which messages
        // should not be compressed.
    }
});

const listeners = {
    getGuild: (ws, json) => {
        if (json.hasOwnProperty("url")) {
            Manager.guild.getFromURL(json.url, guild => {
                ws.send(JSON.stringify({type: "setGuild", guild: /*Manager.guild.pretty(*/guild/*)*/ }));
            });
        } else {
            // DO SOMETHING ELSE.
        }
    },
    getQueue: (ws, json) => {
        if (json.hasOwnProperty("id")) {
            Manager.queue.getFromId(json.id, queue => {
                ws.send(JSON.stringify({type: "setQueue", queue: queue}))
            });
        }
    }
};

wss.on('connection', function connection(ws) {
    ws.on('message', function incoming(message) {
        try {
            let json = JSON.parse(message);

            if (json && json.hasOwnProperty("type") && listeners.hasOwnProperty(json.type)) {
                listeners[json.type](ws, json);
            }
        } catch (err) {
            console.error(err);
        }
    });
});

module.exports = {
    sendQueueUpdate: guild => {

    }
};


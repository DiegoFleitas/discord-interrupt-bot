const Discord = require("discord.js");
const client = new Discord.Client();

/* Config */
const TOKEN = ""; // Bot TOKEN here
const OWNER = 0; // Optional, put your own ID here so that you're the only one who can run bot commands
const SILENCE_MAX_TIME = 20; // Time in seconds of silence before alerting
const CHANNEL_ID = ""; // The channel where to alert
/* Config */

client.on("ready", () => {
    // Fetches every member of all the guilds the bot is in (probably not required)
    client.guilds.cache.forEach((guild) => {
        guild.members.fetch();
    });
    console.log(`The bot is ready! Logged in as ${client.user.username}#${client.user.discriminator}`);
});

// This variable will be dynamically updated to the ID of the person you specify with !voicecheck <id>
// best to leave this alone
let target = 0;
var scheduledAlert = null;

function joinChannel(channel, message) {
    try {
        channel.join().then(connection => {
            console.log(`Successfully joined 🔊 ${connection.channel.name}!`);
            connection.on('speaking', (member, speaking) => {
                if (member.id != target) return; // We only want check the target, not the entire voice channel
                // Outputs whether or not they're currently speaking
                if (speaking["bitfield"] == 1) {
                    console.log(`${member.username} is speaking`);
                    // stop timer
                    clearTimeout(scheduledAlert);
                } else {
                    console.log(`${member.username} stopped speaking ${new Date().toTimeString()}`);
                    // start timer
                    scheduledAlert = setTimeout(() => {
                        console.log(`${member.username} has been silent for ${SILENCE_MAX_TIME} seconds ${new Date().toTimeString()}`);
                        const msg = `${member.username} silent ${SILENCE_MAX_TIME} seconds`;
                        client.channels.cache.get(CHANNEL_ID).send(msg, { tts: true });
                        scheduledAlert = null;
                    }, SILENCE_MAX_TIME * 1000);
                }
            });
        });
    } catch (err) {
        console.log(err);
    }
}

client.on("message", message => {
    try {
        if (message.content.startsWith("!voicecheck")) {
            // If OWNER is specified, ignore everyone else besides the owner
            if (OWNER != 0 && parseInt(message.author.id) !== OWNER) return;
            let args = message.content.split(" ");
            try { message.delete(); } catch (e) { }; // Delete the message if we have the perms to do so
            if (args[1] == null) {
                // No ID specified
                const msg = "You need to put the ID of the person you're trying to voicecheck after the command (example: !voicecheck 1234567890)"
                client.channels.cache.get(CHANNEL_ID).send(msg);
                return;
            }
            let targetMember = message.guild.members.cache.get(args[1]); // Get member object from ID
            if (targetMember != null) {
                // Member exists
                target = args[1]
                const msg = `I set the target to <@${args[1]}>! If they're already in a VC, I'll auto-join. If not, I'll join the VC right after they do!`
                client.channels.cache.get(CHANNEL_ID).send(msg);
                console.log(`Now checking voice: ${targetMember.user.username}#${targetMember.user.discriminator} (ID: ${target})`);
                if (targetMember.voice.channel != null) {
                    joinChannel(targetMember.voice.channel, message); // Join the target's VC if they're already in one
                }
            } else {
                // ID is invalid, at least for the message's guild
                const msg = "I couldn't find that user in your server, double check the ID?"
                client.channels.cache.get(CHANNEL_ID).send(msg);
            }
        }
    } catch (err) {
        console.log(err);
    }
})

client.on('voiceStateUpdate', (oldMember, newMember) => {
    try {
        if (newMember.channel != null) {
            // User joined a voice channel
            if (newMember.id == target) joinChannel(newMember.channel); // Follow them into the voice channel
        } else {
            // User left the voice channel
            if (newMember.id == target) oldMember.channel.leave(); // Leave with them
        }
    } catch (err) {
        console.log(err)
    }
});

client.login(TOKEN);

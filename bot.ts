const { Client, Message, VoiceState, GatewayIntentBits, Events, Partials } = require("discord.js");
const { joinVoiceChannel, getVoiceConnection, VoiceConnectionStatus, VoiceRecorder } = require("@discordjs/voice");
const ffmpeg = require("ffmpeg-static");
const fs = require("fs");
const { Readable } = require('stream');
const record = require("node-record-lpcm16");
require('dotenv').config();

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.DirectMessages, GatewayIntentBits.GuildVoiceStates],
    partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});
client.once(Events.ClientReady, c => {
	console.log(`Ready! Logged in as ${c.user.tag}`);
});
client.login(process.env.BOT_TOKEN);

let voiceRecorder = null;

async function join(message) {
    const channel = joinVoiceChannel({
        channelId: message.channelId,
        guildId: message.guildId,
        adapterCreator: message.channel.guild.voiceAdapterCreator,
    });
    const connection = getVoiceConnection(channel.joinConfig.guildId);
    connection.on(VoiceConnectionStatus.Ready, async () => {
        voiceRecorder = new VoiceRecorder(connection, {
            sampleRate: 48000,
            channelCount: 2,
        });
        voiceRecorder.start();
    });
}

client.on(Events.MessageCreate, async (message) => {
    if (message.channelId !== "719623619684335767") return;
    if (message.content === "join") {
        join(message);
    }
    if (message.content === "leave") {
        const channel = message.member.voice.channel;
        if (voiceRecorder != null && channel){
            const audioStream = voiceRecorder.stop();
            const readableAudioStream = new Readable({
                read() {
                    this.push(audioStream);
                    this.push(null);
                },
            });
            const date = new Date();
            const year = date.getFullYear();
            const month = date.getMonth() + 1;
            const day = date.getDate();
            channel.members.forEach((member) => {
                const fileName = `recording-${year}-${month}-${day}-${member.id}.wav`;
                const wavFile = fs.createWriteStream(fileName);
                readableAudioStream.pipe(wavFile);
            });
        }
        channel.leave();
        voiceRecorder = null;
    }
});

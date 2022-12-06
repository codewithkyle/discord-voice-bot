const { Client, Message, VoiceState } = require("discord.js");
const ffmpeg = require("ffmpeg-binaries");
const fs = require("fs");
const record = require("node-record-lpcm16");
require('dotenv').config();

const client = new Client();
client.login(process.env.BOT_TOKEN);
const usersInChannel = new Map();

async function joinVoiceChannel(message) {
  const voiceChannels = message.guild.channels.cache.filter(channel => channel.type === "voice");
  if (voiceChannels.size > 0) {
    const channel = voiceChannels.first();
    const connection = await channel.join();
    client.on("voiceStateUpdate", (oldState, newState) => {
      if (usersInChannel.has(newState.id) && !newState.channelID) {
        usersInChannel.delete(newState.id);
        record.stop(newState.id);
      }
      if (!usersInChannel.has(newState.id) && newState.channelID === channel.id) {
        usersInChannel.set(newState.id, newState);
        const date = new Date();
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const day = date.getDate();
        const audioStream = connection.receiver.createStream(newState.id);
        const fileStream = fs.createWriteStream(`recording-${year}-${month}-${day}-${newState.id}.wav`);
        record
          .start({
            sampleRateHertz: 48000,
            threshold: 0,
            verbose: false,
            recordProgram: "rec",
            silence: "10.0",
          })
          .pipe(fileStream);
        audioStream.pipe(record);
      }
    });
  }
}

client.on("message", (message) => {
  if (message.content === "join") {
    joinVoiceChannel(message);
  }
  if (message.content === "leave") {
    const channel = message.member.voice.channel;
    channel.leave();
    record.stop();
  }
});

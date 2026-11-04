const { Client, GatewayIntentBits } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus } = require('@discordjs/voice');
const express = require('express');
const path = require('path');

// 1. Webserver pro Render
const app = express();
const port = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('Discord bot běží!'));
app.listen(port, () => console.log(`Webserver běží na portu ${port}`));

// 2. Klient s právy pro Voice, Zprávy i jejich obsah
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

const TOKEN = process.env.TOKEN;
const AUDIO_FILE = path.join(__dirname, 'zvuk.opus');

// Pomocná funkce pro připojení a přehrání zvuku
function playSoundInChannel(channel) {
    const connection = joinVoiceChannel({
        channelId: channel.id,
        guildId: channel.guild.id,
        adapterCreator: channel.guild.voiceAdapterCreator,
    });

    const player = createAudioPlayer();
    const resource = createAudioResource(AUDIO_FILE);

    player.play(resource);
    connection.subscribe(player);

    player.on(AudioPlayerStatus.Idle, () => {
        connection.destroy();
    });
}

client.once('clientReady', () => {
    console.log(`Bot je připraven a přihlášen jako ${client.user.tag}`);
});

// A) Automatické spuštění při vstupu do hlasového kanálu
client.on('voiceStateUpdate', (oldState, newState) => {
    if (newState.member.user.bot) return;

    if (!oldState.channelId && newState.channelId) {
        playSoundInChannel(newState.channel);
    }
});

// B) Manuální vyvolání příkazem !zvuk v libovolném textovém kanálu
client.on('messageCreate', (message) => {
    if (message.author.bot) return;

    if (message.content.trim() === '!zvuk') {
        const voiceChannel = message.member.voice.channel;

        if (!voiceChannel) {
            return message.reply('Musíš být v hlasovém kanálu, abych mohl přehrát zvuk.');
        }

        playSoundInChannel(voiceChannel);
    }
});

client.login(TOKEN);
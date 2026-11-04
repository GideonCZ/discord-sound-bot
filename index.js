const { Client, GatewayIntentBits } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus } = require('@discordjs/voice');
const express = require('express');
const path = require('path');

// 1. Falešný webserver pro Render (aby služba nespadla)
const app = express();
const port = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('Discord bot běží!'));
app.listen(port, () => console.log(`Webserver běží na portu ${port}`));

// 2. Logika Discord bota
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
    ]
});

const TOKEN = process.env.TOKEN; // Token se načte z proměnných prostředí Renderu
const AUDIO_FILE = path.join(__dirname, 'zvuk.opus');

client.once('ready', () => {
    console.log(`Bot je připraven a přihlášen jako ${client.user.tag}`);
});

client.on('voiceStateUpdate', (oldState, newState) => {
    if (newState.member.user.bot) return;

    if (!oldState.channelId && newState.channelId) {
        const channel = newState.channel;
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
});

client.login(TOKEN);
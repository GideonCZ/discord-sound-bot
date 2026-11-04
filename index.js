const { Client, GatewayIntentBits } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, getVoiceConnection } = require('@discordjs/voice');
const express = require('express');
const path = require('path');

// 1. Webserver pro Render
const app = express();
const port = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('Discord bot běží!'));
app.listen(port, () => console.log(`Webserver běží na portu ${port}`));

// 2. Klient Discord bota
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
    ]
});

const TOKEN = process.env.TOKEN;
const AUDIO_FILE = path.join(__dirname, 'zvuk.opus');

// Pomocná funkce pro spuštění přehrání audia
function playAudio(connection) {
    const player = createAudioPlayer();
    const resource = createAudioResource(AUDIO_FILE);

    player.play(resource);
    connection.subscribe(player);

    player.on('error', error => {
        console.error('[CHYBA PŘEHRÁVÁNÍ]', error.message);
    });
}

client.once('clientReady', () => {
    console.log(`Bot je připraven a přihlášen jako ${client.user.tag}`);
});

client.on('voiceStateUpdate', (oldState, newState) => {
    // Ignorujeme boty
    if (newState.member?.user.bot || oldState.member?.user.bot) return;

    const botId = client.user.id;

    // A) Uživatel vstoupil do roomky (zvenku nebo přešel z jiného kanálu)
    if (newState.channelId && oldState.channelId !== newState.channelId) {
        const targetChannel = newState.channel;
        let connection = getVoiceConnection(targetChannel.guild.id);

        // Pokud bot v daném kanálu ještě není, připojí se tam
        if (!connection || connection.joinConfig.channelId !== targetChannel.id) {
            connection = joinVoiceChannel({
                channelId: targetChannel.id,
                guildId: targetChannel.guild.id,
                adapterCreator: targetChannel.guild.voiceAdapterCreator,
            });
        }

        // Přehrát zvuk
        playAudio(connection);
    }

    // B) Uživatel odešel z kanálu (nebo přešel jinam)
    if (oldState.channelId && oldState.channelId !== newState.channelId) {
        const leftChannel = oldState.channel;
        const connection = getVoiceConnection(leftChannel.guild.id);

        // Kontrola, zda bot sedí v místnosti, ze které se odešlo
        if (connection && connection.joinConfig.channelId === leftChannel.id) {
            // Počet lidí v místnosti bez botů
            const humanMembers = leftChannel.members.filter(member => !member.user.bot);

            // Pokud už nezbyl žádný reálný člověk, bot místnost opustí
            if (humanMembers.size === 0) {
                connection.destroy();
                console.log(`Kanál ${leftChannel.name} je prázdný, bot se odpojil.`);
            }
        }
    }
});

client.login(TOKEN);
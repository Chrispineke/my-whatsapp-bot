const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

// --- ⚙️ CONFIGURATION ⚙️ ---
const BOT_NUMBER = "254712345678"; // 👈 REPLACE with your bot's number (Include country code, no +)
const WELCOME_MESSAGE = "Welcome to the group! Please follow the rules. 😊";

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        handleSIGINT: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

// --- 🔑 AUTHENTICATION (Pairing Code) ---
client.on('qr', async (qr) => {
    console.log("Generating Pairing Code...");
    try {
        const pairingCode = await client.getPairingCode(BOT_NUMBER);
        console.log('---------------------------------');
        console.log('STEP 1: Open WhatsApp > Linked Devices');
        console.log('STEP 2: Tap "Link with phone number instead"');
        console.log(`STEP 3: ENTER THIS CODE: ${pairingCode}`);
        console.log('---------------------------------');
    } catch (err) {
        console.error("Pairing code error:", err);
    }
});

client.on('ready', () => {
    console.log('✅ Bot is online and fully functional!');
});

// --- 👋 AUTO-WELCOME FEATURE ---
client.on('group_join', async (notification) => {
    const chat = await notification.getChat();
    // Greets the person who just joined
    chat.sendMessage(`@${notification.recipientIds[0].split('@')[0]} ${WELCOME_MESSAGE}`, {
        mentions: [notification.recipientIds[0]]
    });
});

// --- 🛡️ GROUP COMMANDS ---
client.on('message', async (msg) => {
    const chat = await msg.getChat();
    const body = msg.body.toLowerCase();

    if (chat.isGroup) {
        const authorId = msg.author; 
        const participant = chat.participants.find(p => p.id._serialized === authorId);
        const senderIsAdmin = participant ? participant.isAdmin : false;

        // 1. !mute (Lock group)
        if (body === '!mute' && senderIsAdmin) {
            await chat.setMessagesAdminsOnly(true);
            msg.reply("🔇 Group Muted. Only Admins can talk.");
        }

        // 2. !unmute (Unlock group)
        if (body === '!unmute' && senderIsAdmin) {
            await chat.setMessagesAdminsOnly(false);
            msg.reply("🔊 Group Unmuted. Everyone can talk.");
        }

        // 3. !add [number]
        if (body.startsWith('!add ') && senderIsAdmin) {
            const num = body.split(' ')[1] + "@c.us";
            try { 
                await chat.addParticipants([num]); 
                msg.reply("✅ Added."); 
            } catch (e) { 
                msg.reply("❌ Error adding number."); 
            }
        }

        // 4. !remove (Reply to a message)
        if (body === '!remove' && senderIsAdmin && msg.hasQuotedMsg) {
            const quotedMsg = await msg.getQuotedMessage();
            await chat.removeParticipants([quotedMsg.author]);
            msg.reply("👋 Member removed.");
        }

        // 5. !promote (Reply to a message)
        if (body === '!promote' && senderIsAdmin && msg.hasQuotedMsg) {
            const quotedMsg = await msg.getQuotedMessage();
            await chat.promoteParticipants([quotedMsg.author]);
            msg.reply("🎖️ Promoted to Admin.");
        }

        // 6. !tagall
        if (body === '!tagall' && senderIsAdmin) {
            let mentions = [];
            let text = "📢 *Attention Everyone:*\n\n";
            for(let p of chat.participants) {
                const contact = await client.getContactById(p.id._serialized);
                mentions.push(contact);
                text += `@${p.id.user} `;
            }
            chat.sendMessage(text, { mentions });
        }
    }
});

client.initialize();
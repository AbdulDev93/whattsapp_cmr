const qrcode = require('qrcode-terminal');
const { Client, LocalAuth } = require('whatsapp-web.js');

// ✅ CONFIGURATION
const CONFIG = {
    SESSION_DURATION: 3600, // Session time (seconds)
    DELAY_BETWEEN_MESSAGES: 3, // Har message ke darmiyan delay (seconds)
    AUTO_CLOSE: true
};

// ✅ MULTIPLE NUMBERS - Yahan numbers add karein
const CONTACTS = [
    {
        name: "Apna Number",
        phone: "923140699386",
        message: "Assalam-o-Alaikum! Ye test message hai apne aap ko."
    },
    {
        name: "Friend 1",
        phone: "923402518193", // Replace with actual number
        message: "Hello! Ye test message hai dost ko."
    },

];

// Create client
const client = new Client({
    authStrategy: new LocalAuth({
        clientId: "whatsapp-bot",
        dataPath: "./whatsapp_auth"
    }),
    puppeteer: {
        headless: false,
        executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-web-security',
            '--disable-features=IsolateOrigins,site-per-process',
            '--window-size=800,600'
        ]
    },
    webVersionCache: {
        type: "remote",
        remotePath: "https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html"
    }
});

// Variables to track
let sessionTimeout;
let totalMessages = 0;
let sentMessages = 0;
let failedMessages = 0;

// ✅ FUNCTION: Session close karein
function closeSession(reason = "Session time complete") {
    console.log(`\n🛑 ${reason}`);
    console.log(`📊 Summary: ${sentMessages}/${totalMessages} messages sent successfully`);
    if (failedMessages > 0) {
        console.log(`❌ Failed: ${failedMessages} messages`);
    }
    console.log('⏳ Closing session...');
    
    if (sessionTimeout) {
        clearTimeout(sessionTimeout);
    }
    
    client.destroy().then(() => {
        console.log('✅ Session closed successfully');
        process.exit(0);
    }).catch(err => {
        console.log('❌ Error closing session:', err.message);
        process.exit(0);
    });
}

// ✅ FUNCTION: Single message send karein
async function sendMessageToContact(contact) {
    const chatId = contact.phone + "@c.us";
    
    console.log(`\n📤 Sending to: ${contact.name}`);
    console.log(`📱 Number: ${contact.phone}`);
    console.log(`💬 Message: "${contact.message}"`);
    
    try {
        const sentMessage = await client.sendMessage(chatId, contact.message);
        sentMessages++;
        
        console.log(`✅ Sent to ${contact.name}!`);
        console.log(`   Message ID: ${sentMessage.id.id}`);
        console.log(`   Time: ${new Date().toLocaleTimeString()}`);
        
        return { success: true, contact: contact.name };
        
    } catch (error) {
        failedMessages++;
        console.log(`❌ Failed to send to ${contact.name}: ${error.message}`);
        
        // Alternative try karein
        try {
            console.log(`   🔄 Trying alternative method...`);
            await client.sendMessage(contact.phone, contact.message + " (Alternative)");
            console.log(`   ✅ Alternative successful for ${contact.name}`);
            sentMessages++;
            failedMessages--;
            return { success: true, contact: contact.name };
        } catch (err2) {
            console.log(`   ❌ Alternative also failed for ${contact.name}`);
            return { success: false, contact: contact.name, error: error.message };
        }
    }
}

// ✅ FUNCTION: All messages send karein
async function sendAllMessages() {
    console.log('\n📋 Starting bulk message sending...');
    console.log(`📊 Total contacts: ${CONTACTS.length}`);
    totalMessages = CONTACTS.length;
    
    const results = [];
    
    for (let i = 0; i < CONTACTS.length; i++) {
        const contact = CONTACTS[i];
        
        console.log(`\n--- [${i + 1}/${CONTACTS.length}] -------------------`);
        
        const result = await sendMessageToContact(contact);
        results.push(result);
        
        // Agar last contact nahi hai toh delay karein
        if (i < CONTACTS.length - 1) {
            console.log(`⏳ Waiting ${CONFIG.DELAY_BETWEEN_MESSAGES} seconds before next...`);
            await new Promise(resolve => setTimeout(resolve, CONFIG.DELAY_BETWEEN_MESSAGES * 1000));
        }
    }
    
    // Summary show karein
    console.log('\n📊 ========== SENDING COMPLETE ==========');
    console.log(`✅ Successful: ${sentMessages}`);
    console.log(`❌ Failed: ${failedMessages}`);
    console.log(`📱 Total attempts: ${totalMessages}`);
    
    // Failed messages list karein
    const failedContacts = results.filter(r => !r.success);
    if (failedContacts.length > 0) {
        console.log('\n📋 Failed contacts:');
        failedContacts.forEach(fc => {
            console.log(`   ❌ ${fc.contact}`);
        });
    }
    
    // Wait before closing
    console.log('\n⏳ Waiting 15 seconds before closing...');
    await new Promise(resolve => setTimeout(resolve, 15000));
    
    if (CONFIG.AUTO_CLOSE) {
        closeSession("All messages processed");
    } else {
        console.log('\n✅ All messages processed. Session active...');
        console.log('❌ Manually close karne ke liye Ctrl+C dabayein');
    }
}

// ✅ QR code event
client.on('qr', (qr) => {
    console.log('\n📱 WhatsApp QR Code Scan Karain:\n');
    qrcode.generate(qr, { small: true });
    console.log('\n✅ QR Code generated. Mobile WhatsApp se scan karein!');
    
    // Agar 5 minutes mein QR scan nahi kiya toh auto close
    setTimeout(() => {
        if (sentMessages === 0) {
            console.log('\n⚠️  QR code 5 minutes se bina scan ke hai...');
            console.log('🔄 Program restart karein agar QR scan nahi kar sake');
        }
    }, 300000);
});

// ✅ Client ready event
client.on('ready', () => {
    console.log('\n✅ Client is READY! WhatsApp connected.');
    console.log(`⏳ Session duration: ${CONFIG.SESSION_DURATION} seconds`);
    console.log(`📋 Total contacts to message: ${CONTACTS.length}`);
    
    // ✅ TOTAL SESSION TIME SET KAREIN
    sessionTimeout = setTimeout(() => {
        closeSession(`Session time complete (${CONFIG.SESSION_DURATION} seconds)`);
    }, CONFIG.SESSION_DURATION * 1000);
    
    // ✅ Wait 10 seconds then start sending
    setTimeout(async () => {
        console.log('\n🚀 Starting message sending process...');
        await sendAllMessages();
    }, 10000);
});

// ✅ Events handle karein
client.on('auth_failure', msg => {
    console.error('❌ Authentication failed:', msg);
    closeSession("Authentication failed");
});

client.on('disconnected', reason => {
    console.log('❌ Client disconnected:', reason);
    closeSession("Disconnected from WhatsApp");
});

client.on('loading_screen', (percent, message) => {
    console.log(`⏳ Loading: ${percent}% - ${message}`);
});

// ✅ Ctrl+C se manually close karne ka option
process.on('SIGINT', () => {
    console.log('\n\n⚠️  Ctrl+C pressed. Closing session...');
    console.log(`📊 Progress: ${sentMessages}/${totalMessages} messages sent`);
    closeSession("Manually closed by user");
});

// ✅ Initialize client
console.log('🚀 WhatsApp Bulk Message Bot Starting...');
console.log('⚠️  Browser khulega, QR code scan karein');
console.log(`⏱️  Total session time: ${CONFIG.SESSION_DURATION} seconds`);
console.log(`📱 Contacts to message: ${CONTACTS.length}`);
console.log('❌ Manually close karne ke liye: Ctrl+C\n');
client.initialize();
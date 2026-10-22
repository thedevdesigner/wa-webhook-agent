const express = require('express');
const app = express();

// Middleware to parse incoming JSON payloads from Meta
app.use(express.json());

// PORT configuration (defaults to 3000)
const PORT = process.env.PORT || 3000;

// --- CONFIGURATION CREDENTIALS ---
// Set this to any secret password string you want. 
// You will type this exact same string into the Meta Dashboard.
const MY_VERIFY_TOKEN = "my_super_secret_verify_token_123";

/**
 * 1. WEBHOOK VERIFICATION (GET Route)
 * Meta hits this endpoint to verify that your callback URL is valid.
 */
app.get('/webhook', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    // Check if a token and mode were sent
    if (mode && token) {
        // Check if the mode and token sent are correct
        if (mode === 'subscribe' && token === MY_VERIFY_TOKEN) {
            console.log('WEBHOOK_VERIFIED: Successfully verified webhook with Meta!');
            // Respond with the challenge token from the request to complete verification
            res.status(200).send(challenge);
        } else {
            // Mismatch in tokens or mode
            console.log('Verification failed: Token mismatch.');
            res.sendStatus(403);
        }
    } else {
        res.sendStatus(400);
    }
});

/**
 * 2. WEBHOOK EVENT LISTENER (POST Route)
 * Meta fires POST requests here whenever someone messages your WhatsApp number.
 */
app.post('/webhook', (req, res) => {
    const body = req.body;

    // Log the full JSON payload so you can inspect incoming messages
    console.log("--- INCOMING WEBHOOK PAYLOAD ---");
    console.log(JSON.stringify(body, null, 2));

    // Check if this is an event from the WhatsApp business account
    if (body.object === 'whatsapp_business_account') {
        // Iterate through entries (sometimes there are multiple)
        body.entry.forEach(entry => {
            entry.changes.forEach(change => {
                if (change.field === 'messages') {
                    const value = change.value;
                    
                    // Check if messages array exists and contains a message
                    if (value && value.messages && value.messages.length > 0) {
                        const incomingMessage = value.messages[0];
                        const senderPhone = incomingMessage.from; // Sender's WhatsApp number
                        const messageText = incomingMessage.text ? incomingMessage.text.body : "[Non-text message]";

                        console.log(`\nNew Message Received!`);
                        console.log(`From: ${senderPhone}`);
                        console.log(`Message: ${messageText}\n`);
                    }
                }
            });
        });

        // Always return a 200 OK fast so Meta knows you received the event
        // (If you don't return 200, Meta will keep retrying/resending the webhook)
        res.status(200).send('EVENT_RECEIVED');
    } else {
        res.sendStatus(404);
    }
});

// Simple root route to check if server is running
app.get('/', (req, res) => {
    res.send('Meta Webhook Server is live and running!');
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running and listening on port ${PORT}`);
});
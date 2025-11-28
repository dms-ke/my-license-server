// client_simulator.js
const axios = require('axios');
const readline = require('readline');

// CONFIGURATION
const SERVER_URL = 'http://localhost:3000/api/validate_license';

// 1. Simulate a Hardware ID
// In a real app, this would be a hash of the motherboard serial, CPU ID, or MAC address.
// We allow you to change this manually to simulate "Device Spoofing".
let MY_DEVICE_ID = 'DEVICE-111-ORIGINAL-PC'; 

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

console.log("--- 🖥️  CLIENT SOFTWARE SIMULATOR ---");
console.log(`Your Simulated HWID: ${MY_DEVICE_ID}`);

// Helper to get user input
const ask = (query) => new Promise((resolve) => rl.question(query, resolve));

async function start() {
    // 2. Ask the user for their key (or load it from a config file)
    const key = await ask('\n🔑 Enter your License Key: ');
    
    // Allow user to change Device ID for testing "Theft" scenarios
    const customId = await ask(`💻 Press ENTER to use '${MY_DEVICE_ID}' or type a new ID to simulate a different PC: `);
    if(customId.trim()) MY_DEVICE_ID = customId.trim();

    console.log(`\n📡 Connecting to server as [${MY_DEVICE_ID}]...`);

    try {
        // 3. Send the validation request
        const response = await axios.post(SERVER_URL, {
            license_key: key.trim(),
            device_id: MY_DEVICE_ID
        });

        // 4. Handle SUCCESS
        console.log("\n✅ SERVER RESPONSE: 200 OK");
        console.log("------------------------------------------------");
        console.log(`Status:  ${response.data.status}`);
        console.log(`Message: ${response.data.message}`);
        console.log("------------------------------------------------");
        console.log("🎉 APPLICATION LAUNCHING... (License Valid)");

    } catch (error) {
        // 5. Handle ERRORS (Theft, Invalid Key, Revoked)
        if (error.response) {
            // The server responded with a status other than 2xx
            console.log(`\n❌ SERVER RESPONSE: ${error.response.status} (${error.response.statusText})`);
            console.log("------------------------------------------------");
            console.log(`Reason:  ${error.response.data.message}`);
            console.log("------------------------------------------------");
            console.log("🚫 APPLICATION CLOSING... (License Invalid)");
        } else {
            // Network error (Server down)
            console.log("\n⚠️  NETWORK ERROR");
            console.log("Could not reach the licensing server. Is it running?");
        }
    } finally {
        rl.close();
    }
}

start();
require('dotenv').config(); // 1. Load environment variables from .env
const mongoose = require('mongoose');
const crypto = require('crypto');
const License = require('./models/License'); // 2. Import the Shared Schema

// --- CONFIGURATION ---
const MONGO_URI = process.env.MONGO_URI;

// 3. Safety Check & Debugging
if (!MONGO_URI) {
    console.error("❌ FATAL ERROR: MONGO_URI is missing from your .env file.");
    console.error("   Please ensure you have a file named '.env' containing: MONGO_URI=mongodb+srv://...");
    process.exit(1);
}

// Print where we are connecting (hiding the password for security)
// This confirms you are NOT connecting to localhost
const dbDomain = MONGO_URI.includes('@') ? MONGO_URI.split('@')[1].split('/')[0] : 'Unknown';
console.log(`🔌 Preparing to connect to: ${dbDomain}`);

// --- KEY GENERATOR FUNCTION ---
function generateKey(segments = 4, segmentLength = 4) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let keyParts = [];
    for (let i = 0; i < segments; i++) {
        let segment = '';
        const randomBytes = crypto.randomBytes(segmentLength);
        for (let j = 0; j < segmentLength; j++) {
            segment += chars[randomBytes[j] % chars.length];
        }
        keyParts.push(segment);
    }
    return keyParts.join('-');
}

// --- MAIN LOGIC ---
async function createKeys(count, label) {
    try {
        // Connect to the Cloud Database
        await mongoose.connect(MONGO_URI);
        console.log("✅ CONNECTED TO CLOUD DB");

        console.log(`\n⚙️  Generating ${count} keys...`);

        for (let i = 0; i < count; i++) {
            const newKey = generateKey();
            
            // Create the license using the Shared Model
            await new License({
                key: newKey,
                label: label || `Batch-${new Date().toISOString()}`,
                deviceId: null, // Explicitly null (Unlocked)
                isActive: true
            }).save();

            console.log(`   👉 Created: ${newKey}`);
        }

        console.log(`\n🎉 Success! Generated ${count} keys in the Cloud.`);
        console.log("   (You can now use these keys in the Client Simulator)");

    } catch (e) {
        console.error("\n❌ Error during generation:", e.message);
    } finally {
        await mongoose.disconnect();
        console.log("👋 Disconnected.");
    }
}

// --- CLI ARGUMENT PARSING ---
const count = parseInt(process.argv[2], 10);
const label = process.argv[3];

if (!count) {
    console.log("\n⚠️  USAGE ERROR");
    console.log("   Correct Usage: node admin_key_generator.js <count> [label]");
    console.log("   Example:       node admin_key_generator.js 5 \"November Batch\"\n");
} else {
    createKeys(count, label);
}
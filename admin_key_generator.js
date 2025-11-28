require('dotenv').config(); 
const mongoose = require('mongoose');
const crypto = require('crypto');
const License = require('./models/License'); 

// Load Cloud URI from .env
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
    console.error("❌ ERROR: MONGO_URI is missing.");
    console.error("   Make sure you have a .env file with your connection string!");
    process.exit(1);
}

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

async function createKeys(count, label) {
    try {
        await mongoose.connect(MONGO_URI);
        console.log("✅ DB Connected");

        for (let i = 0; i < count; i++) {
            const newKey = generateKey();
            await new License({
                key: newKey,
                label: label || `Batch-${new Date().toISOString()}`,
                deviceId: null 
            }).save();
            console.log(`   👉 Created: ${newKey}`);
        }
    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
    }
}

const count = parseInt(process.argv[2], 10);
const label = process.argv[3];

if (!count) {
    console.log("Usage: node admin_key_generator.js <count> [label]");
} else {
    createKeys(count, label);
}
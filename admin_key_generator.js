require('dotenv').config(); // Load config
const mongoose = require('mongoose');
const crypto = require('crypto');
const License = require('./models/License'); // Import shared model

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/licenseDB';

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
            // Using the Shared Model ensures structure matches Server.js
            await new License({
                key: newKey,
                label: label || `Batch-${new Date().toISOString()}`
            }).save();
            console.log(`   Created: ${newKey}`);
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
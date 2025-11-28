require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');

// 1. IMPORT SHARED MODEL (Crucial for matching the Generator)
const License = require('./models/License'); 

const app = express();
app.use(bodyParser.json()); 

// 2. CONFIGURATION (Load from Cloud Environment)
const PORT = process.env.PORT || 3000;
const ADMIN_SECRET = process.env.ADMIN_SECRET;
const MONGO_URI = process.env.MONGO_URI;

// Safety Check
if (!ADMIN_SECRET || !MONGO_URI) {
    console.error("❌ ERROR: Missing MONGO_URI or ADMIN_SECRET.");
    console.error("   If running locally, check your .env file.");
    console.error("   If on Render, check your Environment Variables.");
}

// 3. CONNECT TO DATABASE
mongoose.connect(MONGO_URI || 'mongodb://localhost:27017/licenseDB')
    .then(() => console.log("✅ Database Connected."))
    .catch(err => console.error("❌ DB Connection Error:", err.message));

// --- ENDPOINTS ---

// Validation Endpoint
app.post('/api/validate_license', async (req, res) => {
    const { license_key, device_id } = req.body; 

    if (!license_key || !device_id) {
        return res.status(400).json({ status: "failure", message: "Missing input." });
    }

    try {
        const licenseEntry = await License.findOne({ key: license_key });

        if (!licenseEntry || !licenseEntry.isActive) {
            return res.status(401).json({ status: "failure", message: "Invalid or inactive license." });
        }

        const lockedDevice = licenseEntry.deviceId;

        if (!lockedDevice) {
            // First use: Atomic Lock
            const lockedLicense = await License.findOneAndUpdate(
                { key: license_key, deviceId: null },
                { $set: { deviceId: device_id } },
                { new: true }
            );

            if (lockedLicense) {
                return res.status(200).json({ status: "success", message: "License activated and locked to this machine." });
            } else {
                return res.status(403).json({ status: "failure", message: "License was just taken." });
            }
            
        } else if (lockedDevice === device_id) {
            return res.status(200).json({ status: "success", message: "License valid." });
        } else {
            return res.status(403).json({ status: "failure", message: `Locked to another machine (ID: ${lockedDevice}).` });
        }
    } catch (e) {
        console.error(e);
        return res.status(500).json({ status: "error", message: "Server error." });
    }
});

// Admin Dashboard
app.get('/admin/licenses', async (req, res) => {
    if (req.query.secret !== ADMIN_SECRET) return res.status(401).send("Unauthorized");
    const licenses = await License.find({}); 
    res.json(licenses); 
});

// Admin Actions
app.post('/admin/revoke_license', async (req, res) => {
    if (req.query.secret !== ADMIN_SECRET) return res.status(401).json({status:"fail"});
    await License.updateOne({ key: req.body.key }, { isActive: false });
    res.json({ status: "success", message: "Revoked" });
});

app.post('/admin/unlock_license', async (req, res) => {
    if (req.query.secret !== ADMIN_SECRET) return res.status(401).json({status:"fail"});
    await License.updateOne({ key: req.body.key }, { deviceId: null });
    res.json({ status: "success", message: "Unlocked" });
});

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
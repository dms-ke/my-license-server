// server.js (Production Ready)
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');

// IMPORT YOUR MODEL
// Ensure you have the 'models/License.js' file we created earlier!
const License = require('./models/License');

const app = express();
app.use(bodyParser.json());

// --- PRODUCTION CONFIGURATION ---
// In the cloud, these come from Environment Variables
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI; 
const ADMIN_SECRET = process.env.ADMIN_SECRET;

if (!MONGO_URI || !ADMIN_SECRET) {
    console.error("❌ FATAL ERROR: MONGO_URI or ADMIN_SECRET is missing.");
    process.exit(1);
}

// --- DATABASE CONNECTION ---
mongoose.connect(MONGO_URI)
    .then(() => console.log("✅ Cloud MongoDB Connected."))
    .catch(err => console.error("❌ DB Connection Error:", err));

// --- VALIDATION ENDPOINT ---
app.post('/api/validate_license', async (req, res) => {
    const { license_key, device_id } = req.body;
    if (!license_key || !device_id) return res.status(400).json({ status: "failure", message: "Missing inputs." });

    try {
        const license = await License.findOne({ key: license_key });
        
        if (!license || !license.isActive) {
            return res.status(401).json({ status: "failure", message: "Invalid or inactive license." });
        }

        if (license.deviceId === device_id) {
            return res.status(200).json({ status: "success", message: "License valid." });
        }

        if (license.deviceId === null) {
            // Atomic Lock
            const lockedLicense = await License.findOneAndUpdate(
                { key: license_key, deviceId: null },
                { $set: { deviceId: device_id } },
                { new: true }
            );
            
            if (lockedLicense) {
                return res.status(200).json({ status: "success", message: "Activated and locked." });
            }
        }

        return res.status(403).json({ status: "failure", message: "License locked to another machine." });

    } catch (e) {
        console.error(e);
        return res.status(500).json({ status: "error", message: "Server error" });
    }
});

// --- ADMIN DASHBOARD ---
app.get('/admin/licenses', async (req, res) => {
    if (req.query.secret !== ADMIN_SECRET) return res.status(401).send("Unauthorized");
    const licenses = await License.find({});
    res.json(licenses); // Returning JSON for simplicity
});

// --- REVOKE/UNLOCK ENDPOINTS ---
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
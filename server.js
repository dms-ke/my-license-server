require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const License = require('./models/License'); 

const app = express();
app.use(bodyParser.json());

// --- CONFIGURATION ---
const PORT = process.env.PORT || 3000;
const ADMIN_SECRET = process.env.ADMIN_SECRET;
const MONGO_URI = process.env.MONGO_URI;

// Safety Checks
if (!MONGO_URI) console.error("❌ ERROR: MONGO_URI is missing.");

mongoose.connect(MONGO_URI || 'mongodb://localhost:27017/licenseDB')
    .then(() => console.log("✅ Database Connected."))
    .catch(err => console.error("❌ DB Connection Error:", err.message));

// --- 1. VALIDATION ENDPOINT ---
app.post('/api/validate_license', async (req, res) => {
    const { license_key, device_id } = req.body; 
    if (!license_key || !device_id) return res.status(400).json({ status: "failure", message: "Missing inputs." });

    try {
        const license = await License.findOne({ key: license_key });
        if (!license || !license.isActive) return res.status(401).json({ status: "failure", message: "Invalid/Inactive." });

        if (license.deviceId === device_id) return res.status(200).json({ status: "success", message: "Valid." });

        if (license.deviceId === null) {
            const locked = await License.findOneAndUpdate(
                { key: license_key, deviceId: null },
                { $set: { deviceId: device_id } },
                { new: true }
            );
            if (locked) return res.status(200).json({ status: "success", message: "Activated." });
        }
        return res.status(403).json({ status: "failure", message: "Locked to another machine." });
    } catch (e) {
        return res.status(500).json({ status: "error", message: "Server error" });
    }
});

// --- 2. PRETTY DASHBOARD (The Fix) ---
app.get('/admin/licenses', async (req, res) => {
    if (req.query.secret !== ADMIN_SECRET) return res.status(401).send("Unauthorized");
    
    try {
        const licenses = await License.find({});
        
        // Generate HTML Table
        let html = `
        <html>
        <head>
            <title>License Dashboard</title>
            <style>
                body { font-family: sans-serif; padding: 20px; background: #f4f4f4; }
                table { width: 100%; border-collapse: collapse; background: white; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
                th, td { padding: 12px; border: 1px solid #ddd; text-align: left; }
                th { background: #007bff; color: white; }
                .active { color: green; font-weight: bold; }
                .revoked { color: red; font-weight: bold; }
                .locked { font-family: monospace; color: #555; }
            </style>
        </head>
        <body>
            <h2>🔑 License Management</h2>
            <table>
                <tr>
                    <th>Key</th>
                    <th>Status</th>
                    <th>Locked To Device</th>
                    <th>Label</th>
                </tr>
        `;

        licenses.forEach(lic => {
            html += `<tr>
                <td style="font-family: monospace">${lic.key}</td>
                <td class="${lic.isActive ? 'active' : 'revoked'}">${lic.isActive ? 'Active' : 'Revoked'}</td>
                <td class="locked">${lic.deviceId || '<span style="color:green">-- UNLOCKED --</span>'}</td>
                <td>${lic.label}</td>
            </tr>`;
        });

        html += `</table></body></html>`;
        res.send(html); // Send HTML instead of JSON

    } catch (e) {
        res.status(500).send("Error loading dashboard");
    }
});

// --- 3. ADMIN ACTIONS ---
app.post('/admin/revoke_license', async (req, res) => {
    if (req.query.secret !== ADMIN_SECRET) return res.status(401).json({status:"fail"});
    await License.updateOne({ key: req.body.key }, { isActive: false });
    res.json({ status: "success" });
});

app.post('/admin/unlock_license', async (req, res) => {
    if (req.query.secret !== ADMIN_SECRET) return res.status(401).json({status:"fail"});
    await License.updateOne({ key: req.body.key }, { deviceId: null });
    res.json({ status: "success" });
});

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
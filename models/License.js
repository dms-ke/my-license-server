// models/License.js
const mongoose = require('mongoose');

const LicenseSchema = new mongoose.Schema({
    key: { type: String, required: true, unique: true },
    deviceId: { type: String, default: null }, // Null means "Unused/Unlocked"
    label: { type: String, default: 'Client License' },
    isActive: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('License', LicenseSchema);
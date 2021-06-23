const express = require(`express`);
const Settings = require(`../models/settings.model`)

const router = express.Router();

router.get(`/status`, async (req, res) => {
    const settings = await Settings.findOne({ id: `settings` })

    res.json({ paused: settings.paused });
});

module.exports = router;
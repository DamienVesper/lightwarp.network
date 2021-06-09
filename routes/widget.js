const express = require(`express`);

const router = express.Router();

router.get(`/tts`, async (req, res) => {res.render(`widgets/tts`, {
    webfront: process.env.URL
})});

module.exports = router;
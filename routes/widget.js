const express = require(`express`);

const router = express.Router();

router.get(`/tts`, async (req, res) => {res.render(`widgets/tts`, {
    webfront: process.env.APP_DOMAIN
})});

module.exports = router;
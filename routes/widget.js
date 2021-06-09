const express = require(`express`);

const router = express.Router();

router.get(`/tts`, async (req, res) => {res.render(`widgets/tts`, {
    webfront: process.env.ENV === `dev` ? `localhost` : `sockets.lightwarp.network`
})});

module.exports = router;
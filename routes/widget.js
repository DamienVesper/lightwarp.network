const express = require(`express`);

const router = express.Router();

router.get(`/tts`, async (req, res) => {res.render(`widgets/tts`, {
    webfront: process.env.ENV === `prod` ? `sockets.lightwarp.network` : `localhost`
})});

module.exports = router;
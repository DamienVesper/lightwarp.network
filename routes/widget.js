const express = require(`express`);

const router = express.Router();

const broadcast = require(`../socket.js`);

router.get(`/tts`, async (req, res) => {res.render(`widgets/tts`, {
    webfront: process.env.APP_DOMAIN
})});

router.get(`/fake`, async (req, res) => {
    res.render(`widgets/fake.ejs`);
});

router.post(`/fake`, async (req, res) => {
    const { name, message } = req.body;
    broadcast(`prioritymessage`, name, message);

    res.sendStatus(200).json({ success: `I like em big` });
});

module.exports = router;
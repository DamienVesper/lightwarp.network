const express = require(`express`);

const router = express.Router();

const broadcast = require(`../socket.js`);

router.get(`/tts`, async (req, res) => {res.render(`widgets/tts`, {
    webfront: process.env.APP_DOMAIN
})});

router.get(`/fake`, async (req, res) => {
    res.render(`widgets/fake.ejs`);
});

router.get(`/bye`, async (req, res) => {
    res.render(`widgets/bye.ejs`);
});

router.post(`/fake`, async (req, res) => {
    const { name, message } = req.body;
    broadcast(`prioritymessage`, name, message);

    res.redirect(`https://lightwarp.network/widget/fake`);
});

router.post(`/bye`, async (req, res) => {
    broadcast(`clearall`);
    res.redirect(`https://lightwarp.network/widget/bye`);
});

module.exports = router;
const express = require(`express`);

const router = express.Router();

const broadcast = require(`../socket.js`);
const log = require(`./utils/log.js`);

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

    log(`fake priority message from ${name} >>> ${message}.`);

    res.redirect(`https://lightwarp.network/widget/fake`);
});

router.post(`/bye`, async (req, res) => {
    broadcast(`clearall`);
    res.redirect(`https://lightwarp.network/widget/bye`);
});

module.exports = router;
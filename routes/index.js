const express = require(`express`);

const router = express.Router();

router.get(`/`, async (req, res) => {res.render(`index`)});

router.get(`/mediashare`, async (req, res) => { res.redirect(`/prioritymessage`) })

router.get(`/streamlocations`, async (req, res) => {res.render(`locations`)});

module.exports = router;
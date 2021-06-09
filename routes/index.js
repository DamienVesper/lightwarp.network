const express = require(`express`);

const router = express.Router();

router.get(`/`, async (req, res) => {res.render(`index`)});

router.get(`/streamlocations`, async (req, res) => {res.render(`locations`)});

router.get(`/widget`, async (req, res) => {res.render(`widget`)});

module.exports = router;
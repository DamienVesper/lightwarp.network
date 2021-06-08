const express = require(`express`);

const router = express.Router();

router.get(`/`, async (req, res) => {res.render(`index`)});

router.get(`/streamlocations`, async (req, res) => {res.render(`locations`)});

module.exports = router;
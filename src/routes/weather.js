const express = require('express');
const router = express.Router();

router.get('/:cityCode', (req, res) => {

    const cityCode = req.params.cityCode;

    const reply = {
        city: `${cityCode}`,
        temperature: 60,
        unit: "C",
        conditions: `rainy`,
        cached: `true`
    };

    res.json(reply);
});

module.exports = router;
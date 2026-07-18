const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 60, // limit each IP to 60 requests per windowMs
    message: { error: 'Too many requests from this IP, please try again after 15 minutes' },
});

module.exports = limiter;
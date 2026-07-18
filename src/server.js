const express = require('express');
const rateLimiter = require('./middleware/rateLimiter');
const weatherRoutes = require('./routes/weather');
const { port } = require('./config/env');

const app = express();
const PORT = port;

app.use('/weather', rateLimiter, weatherRoutes);

app.use((err, req, res, next) => {
    console.error(err);
    const statusCode = err.statusCode || err.status || 500;
    res.status(statusCode).json({ error: err.message });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)
});


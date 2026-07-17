const express = require('express');
const weatherRoutes = require('./routes/weather');
const { port } = require('./config/env');

const app = express();
const PORT = port;

app.use('/weather', weatherRoutes);

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)
});


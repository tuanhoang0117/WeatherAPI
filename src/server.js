const express = require('express');
const weatherRoutes = require('./routes/weather');

const app = express();
const PORT = 3000;

app.use('/weather', weatherRoutes);

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)
});


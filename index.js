require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
const bodyparser = require('body-parser');
const dns = require('dns');
const mongoose = require('mongoose');


// Basic Configuration
const port = process.env.PORT || 3000;

mongoose.connect(process.env.MONGOOSE_URI)

const urlSchema = new mongoose.Schema({
  original_url: { type: String, required: true },
  short_url: { type: Number, required: true }
});

const Url = mongoose.model('Url', urlSchema);

function isValidUrl(urlString) {
  try {
    const url = new URL(urlString);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch (e) {
    return false;
  }
}


app.use(cors());

app.use(bodyparser.urlencoded({ extended: false }))

app.use('/public', express.static(`${process.cwd()}/public`));

app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});



// Your first API endpoint
app.post('/api/shorturl', async (req, res) => {
  const originalUrl = req.body.url;

  // Check if the URL is valid
  if (!isValidUrl(originalUrl)) {
    return res.json({ error: 'invalid url' });
  }

  // Check if the domain is valid (DNS lookup)
  dns.lookup(new URL(originalUrl).hostname, async (err) => {
    if (err) return res.json({ error: 'invalid url' });

    // Generate a short URL identifier
    const count = await Url.countDocuments();
    const newUrl = new Url({
      original_url: originalUrl,
      short_url: count + 1
    });

    // Save to the database
    await newUrl.save();

    // Respond with the shortened URL
    res.json({
      original_url: newUrl.original_url,
      short_url: newUrl.short_url
    });
  });
});

app.get('/api/shorturl/:shortUrl', async (req, res) => {
  const shortUrl = req.params.shortUrl;

  try {
    const foundUrl = await Url.findOne({ short_url: shortUrl });
    if (foundUrl) {
      // Redirect to the original URL
      res.redirect(foundUrl.original_url);
    } else {
      res.status(404).json({ error: 'No short URL found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
})

app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});

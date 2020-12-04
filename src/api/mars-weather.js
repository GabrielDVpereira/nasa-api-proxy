const express = require('express');
const axios = require('axios');
const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');

const router = express.Router();
const BASE_URL = 'https://api.nasa.gov/insight_weather/?';
const SECONDS_30 = 30 * 1000;

const requestLimiter = rateLimit({
  windowMs: SECONDS_30, // window time per request
  max: 10 // max request that is allowed to do in a time window
});

const speedLimiter = slowDown({
  windowMs: SECONDS_30,
  delayAfter: 5, // after 5 requests made in a window of 30 seconds
  delayMs: 500 // increase de response time in 500 ms
});

let cachedData;
let cacheTime;

// in memory api keys for validate users without pass auth
const apiKeys = new Map();
apiKeys.set('12345', true);

const validateApiKey = (req, res, next) => {
  const key = req.headers['X-API-KEY'];
  if (apiKeys.has(key)) {
    return next();
  }
  const error = new Error('Invalid apiKey');
  next(error);
};

router.get('/', validateApiKey, requestLimiter, speedLimiter, async (req, res, next) => {
  const currentCacheTimeOn = cacheTime > Date.now() - SECONDS_30;
  const shouldReturnCache = cacheTime && currentCacheTimeOn;

  // in memory cache
  // Implement redis later
  if (shouldReturnCache) {
    return res.json(cachedData);
  }

  try {
    const params = new URLSearchParams({
      api_key: process.env.NASA_KEY,
      feedtype: 'json',
      ver: '1.0'

    });

    const { data } = await axios.get(BASE_URL + params);

    cachedData = data;
    cacheTime = Date.now();
    data.cacheTime = cacheTime;
    return res.json(data);
  } catch (error) {
    return next(error);
  }
});

module.exports = router;

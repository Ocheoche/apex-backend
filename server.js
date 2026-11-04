const express = require('express');
const crypto = require('crypto');
const fetch = require('node-fetch');
const app = express();

// Parse JSON bodies
app.use(express.json());

// Your Paymento Credentials
const PAYMENTO_API_KEY = "MzFENDAyQTZBNEQ2MDhCM0NEM0YyQUIyNUMzOTlDRUE=";
const PAYMENTO_SECRET_KEY = "MzEwQTk4NzVCRjFCODk3RjU0NkM0RDY5OTkxRUI4NTM=";

// 1. Backend Proxy Route using a Regular Expression (bypasses path-to-regexp parsing issues)
app.post(/^\/api\/paymento\/.*/, async (req, res) => {
  const targetPath = req.path.replace(/^\/api\/paymento\//, '');
  try {
    const response = await fetch(`https://api.paymento.io/${targetPath}`, {
      method: 'POST',
      headers: {
        'Api-Key': PAYMENTO_API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(req.body)
    });
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 2. IPN Webhook Receiver Route
app.post('/api/paymento/callback', (req, res) => {
  const signature = req.headers['x-paymento-signature'] || req.headers['signature'];
  const payload = JSON.stringify(req.body);

  // Verify HMAC-SHA256 signature
  const expectedSignature = crypto
    .createHmac('sha256', PAYMENTO_SECRET_KEY)
    .update(payload)
    .digest('hex')
    .toUpperCase();

  if (signature && signature.toUpperCase() !== expectedSignature) {
    console.error('Invalid Paymento IPN signature');
    return res.status(400).send('Invalid signature');
  }

  const { orderId, orderStatus, settlement } = req.body;

  // Status 7 or 8 represents a successful payment
  if (orderStatus === 7 || orderStatus === 8) {
    const creditedAmount = settlement ? settlement.requestedFiatAmount : 0;
    console.log(`Live payment confirmed for order ${orderId}: $${creditedAmount}`);
    // TODO: Update user balance or order status in your database here
  }

  res.status(200).send('OK');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Backend server running on port ${PORT}`));
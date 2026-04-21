const express = require('express');
const router = express.Router();
const db = require('../db');

// GET single customer
router.get('/:id', async (req, res) => {
  try {
    const customer = await db.getCustomerById(req.params.id);
    if (!customer) return res.status(404).json({ error: 'Customer not found' });
    res.json(customer);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT update customer
router.put('/:id', async (req, res) => {
  try {
    const existing = await db.getCustomerById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Customer not found' });
    if (!req.body.name) return res.status(400).json({ error: 'Customer name is required' });
    res.json(await db.updateCustomer(req.params.id, req.body));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE customer
router.delete('/:id', async (req, res) => {
  try {
    const existing = await db.getCustomerById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Customer not found' });
    await db.deleteCustomer(req.params.id);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;

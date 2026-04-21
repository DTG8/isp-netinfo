const express = require('express');
const router = express.Router();
const db = require('../db');

// GET single link
router.get('/:id', async (req, res) => {
  try {
    const link = await db.getLinkById(req.params.id);
    if (!link) return res.status(404).json({ error: 'Link not found' });
    res.json(link);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT update link
router.put('/:id', async (req, res) => {
  try {
    const existing = await db.getLinkById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Link not found' });
    if (!req.body.name) return res.status(400).json({ error: 'Link name is required' });
    res.json(await db.updateLink(req.params.id, req.body));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE link
router.delete('/:id', async (req, res) => {
  try {
    const existing = await db.getLinkById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Link not found' });
    await db.deleteLink(req.params.id);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET customers under a link
router.get('/:id/customers', async (req, res) => {
  try {
    const link = await db.getLinkById(req.params.id);
    if (!link) return res.status(404).json({ error: 'Link not found' });
    res.json(await db.getCustomersByLink(req.params.id));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST create customer under a link
router.post('/:id/customers', async (req, res) => {
  try {
    const link = await db.getLinkById(req.params.id);
    if (!link) return res.status(404).json({ error: 'Link not found' });
    if (!req.body.name) return res.status(400).json({ error: 'Customer name is required' });
    res.status(201).json(await db.createCustomer(req.params.id, req.body));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;

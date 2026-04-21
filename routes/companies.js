const express = require('express');
const router = express.Router();
const db = require('../db');

// GET all companies (with link counts)
router.get('/', async (req, res) => {
  try {
    res.json(await db.getAllCompanies());
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET single company
router.get('/:id', async (req, res) => {
  try {
    const company = await db.getCompanyById(req.params.id);
    if (!company) return res.status(404).json({ error: 'Company not found' });
    res.json(company);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST create company
router.post('/', async (req, res) => {
  try {
    if (!req.body.name) return res.status(400).json({ error: 'Name is required' });
    res.status(201).json(await db.createCompany(req.body));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT update company
router.put('/:id', async (req, res) => {
  try {
    const existing = await db.getCompanyById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Company not found' });
    res.json(await db.updateCompany(req.params.id, req.body));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE company (cascade deletes links)
router.delete('/:id', async (req, res) => {
  try {
    const existing = await db.getCompanyById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Company not found' });
    await db.deleteCompany(req.params.id);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET links for a company
router.get('/:id/links', async (req, res) => {
  try {
    const company = await db.getCompanyById(req.params.id);
    if (!company) return res.status(404).json({ error: 'Company not found' });
    res.json(await db.getLinksByCompany(req.params.id));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST create link under a company
router.post('/:id/links', async (req, res) => {
  try {
    const company = await db.getCompanyById(req.params.id);
    if (!company) return res.status(404).json({ error: 'Company not found' });
    if (!req.body.name) return res.status(400).json({ error: 'Link name is required' });
    res.status(201).json(await db.createLink(req.params.id, req.body));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;

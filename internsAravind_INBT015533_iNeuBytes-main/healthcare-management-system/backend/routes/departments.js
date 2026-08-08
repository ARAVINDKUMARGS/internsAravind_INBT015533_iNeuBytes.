const express = require('express');
const db = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// GET /api/departments - public listing
router.get('/', async (req, res) => {
  try {
    const [departments] = await db.query(`
      SELECT dep.id, dep.name, dep.description, dep.created_at, COUNT(doc.id) as doctor_count
      FROM departments dep
      LEFT JOIN doctors doc ON doc.department_id = dep.id
      GROUP BY dep.id
      ORDER BY dep.name
    `);
    res.json(departments);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to retrieve departments' });
  }
});

// GET /api/departments/:id
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM departments WHERE id = ?', [req.params.id]);
    const dep = rows[0];
    if (!dep) return res.status(404).json({ error: 'Department not found' });
    res.json(dep);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to retrieve department' });
  }
});

// POST /api/departments - admin only
router.post('/', authenticate, authorize('admin'), async (req, res) => {
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ error: 'Department name is required' });
  try {
    const [info] = await db.query('INSERT INTO departments (name, description) VALUES (?, ?)', [name, description || null]);
    res.status(201).json({ id: info.insertId, name, description });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      res.status(409).json({ error: 'Department already exists' });
    } else {
      console.error(err);
      res.status(500).json({ error: 'Failed to create department' });
    }
  }
});

// PUT /api/departments/:id - admin only
router.put('/:id', authenticate, authorize('admin'), async (req, res) => {
  const { name, description } = req.body;
  try {
    const [rows] = await db.query('SELECT * FROM departments WHERE id = ?', [req.params.id]);
    const dep = rows[0];
    if (!dep) return res.status(404).json({ error: 'Department not found' });
    
    await db.query('UPDATE departments SET name = ?, description = ? WHERE id = ?', 
      [name || dep.name, description !== undefined ? description : dep.description, req.params.id]);
    res.json({ message: 'Department updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update department' });
  }
});

// DELETE /api/departments/:id - admin only
router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM departments WHERE id = ?', [req.params.id]);
    const dep = rows[0];
    if (!dep) return res.status(404).json({ error: 'Department not found' });
    
    await db.query('DELETE FROM departments WHERE id = ?', [req.params.id]);
    res.json({ message: 'Department deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete department' });
  }
});

module.exports = router;

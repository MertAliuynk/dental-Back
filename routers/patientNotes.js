const express = require('express');
const router = express.Router();
const { executeQuery } = require('../helpers/db/utils/queryExecutor');

// Hasta notu ekle
router.post('/', async (req, res) => {
  try {
    const { patient_id, note } = req.body;
    if (!patient_id || !note) return res.status(400).json({ success: false, message: 'Eksik veri' });
    const result = await executeQuery(
      'INSERT INTO patient_notes (patient_id, note) VALUES ($1, $2) RETURNING *',
      [patient_id, note]
    );
    res.json({ success: true, data: result[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Hasta notu güncelle
router.put('/:note_id', async (req, res) => {
  try {
    const { note_id } = req.params;
    const { note } = req.body;
    if (!note) return res.status(400).json({ success: false, message: 'Not gerekli' });
    const result = await executeQuery(
      'UPDATE patient_notes SET note = $1 WHERE note_id = $2 RETURNING *',
      [note, note_id]
    );
    res.json({ success: true, data: result[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Hasta notu sil
router.delete('/:note_id', async (req, res) => {
  try {
    const { note_id } = req.params;
    await executeQuery('DELETE FROM patient_notes WHERE note_id = $1', [note_id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Hasta notlarını listele
router.get('/patient/:patient_id', async (req, res) => {
  try {
    const { patient_id } = req.params;
    const result = await executeQuery('SELECT * FROM patient_notes WHERE patient_id = $1 ORDER BY created_at DESC', [patient_id]);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;

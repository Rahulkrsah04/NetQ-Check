const express = require('express');
const router = express.Router();

/**
 * GET /api/reports
 * List all compliance reports for the authenticated user
 */
router.get('/', async (req, res) => {
  // TODO: Fetch from Firestore/MongoDB based on authenticated user
  res.json({ message: 'Reports API not yet connected. Using demo data on frontend.' });
});

/**
 * GET /api/reports/:reportId
 * Get a specific compliance report
 */
router.get('/:reportId', async (req, res) => {
  res.json({ message: `Report ${req.params.reportId} - fetch from database not yet implemented.` });
});

module.exports = router;

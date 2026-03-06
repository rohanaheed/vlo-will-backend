/**
 * Form Response Routes
 * User-side routes for interacting with dynamic forms
 */

const express = require('express');
const router = express.Router({ mergeParams: true });
const controller = require('./form-response.controller');
const { authenticate } = require('../../middleware/auth');

// All routes require authentication
router.use(authenticate);

// Get form structure for the will
router.get('/form', controller.getWillForm);

// Get progress across all steps
router.get('/progress', controller.getWillProgress);

// Get data for a specific step
router.get('/form/:stepSlug', controller.getStepData);

// Save data for a step
router.put('/form/:stepSlug', controller.saveStepData);

module.exports = router;

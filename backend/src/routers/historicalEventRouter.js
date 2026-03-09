import express from 'express';
import { getEventByDate } from '../controllers/historicalEventController.js';

const router = express.Router();

router.get('/:month/:day', getEventByDate);

export default router;

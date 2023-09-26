import express from 'express';
import { uploadPayments, editPayment, authorizePayment, unauthorizePayment} from '../Controllers/collection.js';
const router = express.Router();

router.post('/upload', uploadPayments);
router.post('/edit', editPayment);
router.post('/authorize', authorizePayment);
router.post('/unauthorize', unauthorizePayment);

export default router;

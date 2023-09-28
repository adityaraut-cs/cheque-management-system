import express from 'express';
import { uploadPayments, getPayments,editPayment, authorizePayment, unauthorizePayment} from '../collection.js';
const router = express.Router();

router.post('/upload', uploadPayments);
router.post('/read', getPayments);
router.post('/edit', editPayment);
router.post('/authorize', authorizePayment);
router.post('/unauthorize', unauthorizePayment);

export default router;

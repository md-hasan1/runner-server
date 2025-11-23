import express from 'express';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { MerchantController } from './Merchant.controller';
import { MerchantValidation } from './Merchant.validation';

const router = express.Router();

router.post(
'/',
auth(),
validateRequest(MerchantValidation.createSchema),
MerchantController.createMerchant,
);
router.post(
'/payment-request',
auth(),
// validateRequest(MerchantValidation.createSchema),
MerchantController.makePaymentRequest,
);

router.get('/', auth(), MerchantController.getMerchantList);
router.get('/get-report', auth(), MerchantController.getReport);
router.get('/get-my-payment-request', auth(), MerchantController.getMyPaymentRequest);

router.get('/:id', auth(), MerchantController.getMerchantById);

router.put(
'/:id',
auth(),
validateRequest(MerchantValidation.updateSchema),
MerchantController.updateMerchant,
);

router.delete('/:id', auth(), MerchantController.deleteMerchant);

export const MerchantRoutes = router;
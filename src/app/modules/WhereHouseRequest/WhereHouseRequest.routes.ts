import express from 'express';
import auth from '../../middlewares/auth';
import { WhereHouseRequestController } from './WhereHouseRequest.controller';

const router = express.Router();

router.post(
'/',
auth(),
// validateRequest(WhereHouseRequestValidation.createSchema),
WhereHouseRequestController.createWhereHouseRequest,
);
router.post(
'/send',
auth(),
// validateRequest(WhereHouseRequestValidation.createSchema),
WhereHouseRequestController.whereHouseParcelSend,
);

router.get('/', auth(), WhereHouseRequestController.getReceivedParcel);
router.get('/generate-invoice', auth(), WhereHouseRequestController.makeInvoiceForAdmin);

router.get('/:id', auth(), WhereHouseRequestController.getWhereHouseRequestById);
router.put(
'/after-payment-change-status',
auth(),
// validateRequest(WhereHouseRequestValidation.createSchema),
WhereHouseRequestController.afterPaymentChangeStatus,
);
router.put(
'/pay-letter/update',
auth(),
// validateRequest(WhereHouseRequestValidation.createSchema),
WhereHouseRequestController.payLetter,
);

router.put(
'/:id',
auth(),
// validateRequest(WhereHouseRequestValidation.updateSchema),
WhereHouseRequestController.updateWhereHouseRequest,
);



router.delete('/:id', auth(), WhereHouseRequestController.deleteWhereHouseRequest);

export const WhereHouseRequestRoutes = router;
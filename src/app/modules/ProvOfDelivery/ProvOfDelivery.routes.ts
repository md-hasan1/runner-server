import express from 'express';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { ProvOfDeliveryController } from './ProvOfDelivery.controller';
import { ProvOfDeliveryValidation } from './ProvOfDelivery.validation';
import { fileUploader } from '../../../helpars/fileUploader';

const router = express.Router();

router.post(
'/:id',
auth(),
// validateRequest(ProvOfDeliveryValidation.createSchema),
fileUploader.addProf,
ProvOfDeliveryController.createProvOfDelivery,
);

router.get('/', auth(), ProvOfDeliveryController.getProvOfDeliveryList);

router.get('/:id', auth(), ProvOfDeliveryController.getProvOfDeliveryById);

router.put(
'/:id',
auth(),
// validateRequest(ProvOfDeliveryValidation.updateSchema),
ProvOfDeliveryController.updateProvOfDelivery,
);

router.delete('/:id', auth(), ProvOfDeliveryController.deleteProvOfDelivery);

export const ProvOfDeliveryRoutes = router;
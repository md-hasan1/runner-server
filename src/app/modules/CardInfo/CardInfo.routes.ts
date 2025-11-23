import express from 'express';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { CardInfoController } from './CardInfo.controller';
import { CardInfoValidation } from './CardInfo.validation';

const router = express.Router();

router.post(
'/',
auth(),
// validateRequest(CardInfoValidation.createSchema),
CardInfoController.createCardInfo,
);

router.get('/', auth(), CardInfoController.getCardInfoList);
router.get('/base-user', auth(), CardInfoController.getCardInfoBaseUser);
router.get('/base-user/:id', auth(), CardInfoController.getCardInfoBaseUserId);

router.get('/:id', auth(), CardInfoController.getCardInfoById);

router.put(
'/:id',
auth(),
// validateRequest(CardInfoValidation.updateSchema),
CardInfoController.updateCardInfo,
);

router.delete('/:id', auth(), CardInfoController.deleteCardInfo);

export const CardInfoRoutes = router;
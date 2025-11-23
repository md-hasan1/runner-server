import express from 'express';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { BankInfoController } from './BankInfo.controller';
import { BankInfoValidation } from './BankInfo.validation';

const router = express.Router();

router.post(
'/',
auth(),
// validateRequest(BankInfoValidation.createSchema),
BankInfoController.createBankInfo,
);

router.get('/', auth(), BankInfoController.getBankInfoList);
router.get('/user-base', auth(), BankInfoController.getBankInfoBaseUser);
router.get('/user-base/:id', auth(), BankInfoController.getBankInfoBaseUserId);

router.get('/:id', auth(), BankInfoController.getBankInfoById);

router.put(
'/:id',
auth(),
// validateRequest(BankInfoValidation.updateSchema),
BankInfoController.updateBankInfo,
);

router.delete('/:id', auth(), BankInfoController.deleteBankInfo);

export const BankInfoRoutes = router;
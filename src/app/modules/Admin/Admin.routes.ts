import express from 'express';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { AdminController } from './Admin.controller';
import { AdminValidation } from './Admin.validation';

const router = express.Router();

router.post(
'/assign-rider',
auth(),
// validateRequest(AdminValidation.createSchema),
AdminController.SendRiderRequest,
);
router.post('/accept-parcel/:id', auth(), AdminController.confirmParcel);
router.post('/accept-ride/:id', auth(), AdminController.rideRequestAccept);
router.post('/reject-parcel/:id', auth(), AdminController.cancelParcel);
router.get('/find-rider', auth(), AdminController.findAllRider);
router.get('/find-rider/:id', auth(), AdminController.findRiderBaseParcelLocations);
router.get('/', auth(), AdminController.getAllCount);
router.get('/reviewed-data', auth(), AdminController.getAllNewRequest);
router.get('/report', auth(), AdminController.report);


router.get('/pending/ride', auth(), AdminController.getAllPendingRideRequests);
router.get('/accepted/ride', auth(), AdminController.getAllAcceptedRideRequests);
router.get('/rejected/ride', auth(), AdminController.getAllRejectedRideRequests);
router.get('/:id', auth(), AdminController.getAdminById);

router.put(
'/:id',
auth(),
validateRequest(AdminValidation.updateSchema),
AdminController.updateAdmin,
);

router.delete('/:id', auth(), AdminController.deleteAdmin);
router.delete('/cancel-ride/:id', auth(), AdminController.cancelRideRequest);

export const AdminRoutes = router;
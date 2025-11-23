import express from "express";
import auth from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import { DeliveryInfoController } from "./DeliveryInfo.controller";
import { DeliveryInfoValidation } from "./DeliveryInfo.validation";

const router = express.Router();

router.post("/", auth(), DeliveryInfoController.createDeliveryInfo);
router.post(
  "/payment",
  auth(),

  DeliveryInfoController.payment
);
router.post(
  "/after-payment",
  auth(),

  DeliveryInfoController.createPaymentInfo
);

router.get("/", auth(), DeliveryInfoController.getDeliveryInfoList);
router.get(
  "/ride-quest",
  auth(),
  DeliveryInfoController.getRideRequestBasedOnRider
);
router.get(
  "/get-parcel-base-user",
  auth(),
  DeliveryInfoController.getUserBaseParcel
);
router.get(
  "/ride-quest/:id",
  auth(),
  DeliveryInfoController.getSingleRideRequest
);
router.get(
  "/searchParcel/:id",
  auth(),
  DeliveryInfoController.searchParcel
);
router.get(
  "/parcel-track/:parcelId",
  auth(),
  DeliveryInfoController.getAllTrackingListByParcel
);

router.get("/:id", auth(), DeliveryInfoController.getDeliveryInfoById);
router.put(
  "/complete",
  auth(),
  DeliveryInfoController.completeDelivery
);
router.put(
  "/update-driver-location",
  auth(),
  DeliveryInfoController.updateDriverLocation
);
router.put(
  "/:id",
  auth(),
  DeliveryInfoController.updateDeliveryInfo
);

router.put(
  "/accept-ride/:id",
  auth(),

  DeliveryInfoController.acceptRideRequestByDriver
);
router.put(
  "/reject-ride/:id",
  auth(),

  DeliveryInfoController.rejectRideRequestByDriver
);


  
router.delete("/:id", auth(), DeliveryInfoController.deleteDeliveryInfo);

router.get(
  "/parcel-location/:parcelId",
  auth(),
  DeliveryInfoController.getParcelLocationWithRider
);

export const DeliveryInfoRoutes = router;

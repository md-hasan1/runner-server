import express from "express";
import validateRequest from "../../middlewares/validateRequest";
import { UserValidation } from "./user.validation";
import { userController } from "./user.controller";
import auth from "../../middlewares/auth";
import { UserRole } from "@prisma/client";
import { fileUploader } from "../../../helpars/fileUploader";

const router = express.Router();

// *!register user
router.post(
  "/register",
  validateRequest(UserValidation.CreateUserValidationSchema),
  userController.createUser
);
router.post(
  "/calculate-price",
  //validateRequest(UserValidation.CreateUserValidationSchema),
  userController.calculatePrice
);
router.post(
  "/complete-driver-profile",
  auth(),
  fileUploader.completeDriverProfile,
  //validateRequest(UserValidation.CreateUserValidationSchema),
  userController.completeDriverProfile
);
router.post(
  "/complete-user-profile",
  auth(),
  fileUploader.uploadSingle,
  //validateRequest(UserValidation.CreateUserValidationSchema),
  userController.completeUserProfile
);
router.post(
  "/complete-merchant-profile",
  auth(),
  fileUploader.uploadSingle,
  //validateRequest(UserValidation.CreateUserValidationSchema),
  userController.completeMerchantProfile
);
router.post(
  "/complete-wareHouse-profile",
  auth(),
  fileUploader.uploadSingle,
  //validateRequest(UserValidation.CreateUserValidationSchema),
  userController.completeWareHouseProfile
);
router.post(
  "/contact-mail",
  //validateRequest(UserValidation.CreateUserValidationSchema),
  userController.contactMail
);
// *!get all  user
router.get("/", userController.getUsers);
// *!get single user
router.get(
  "/:id",
  auth(),
  userController.getSingleUserFromDb
);

// *!profile user
router.put(
  "/profile",
  // validateRequest(UserValidation.userUpdateSchema),

  auth(),
  fileUploader.uploadSingle,
  userController.updateProfile
);

// *!update  user
router.put("/:id", userController.updateUser);
// *!approved user
router.put(
  "/approved/:id",
  auth(),
  userController.approvedUser
);
// *!delete user and relations
router.delete(
  "/remove-profile-image",
  auth(),
  userController.removeProfileImage
);
router.delete(
  "/:id",
  auth(),
  userController.deleteUserAndRelations
);

export const userRoutes = router;

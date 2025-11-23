import httpStatus from "http-status";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { userService } from "./user.services";
import { Request, Response } from "express";
import pick from "../../../shared/pick";
import { userFilterableFields } from "./user.costant";

const createUser = catchAsync(async (req: Request, res: Response) => {
  const result = await userService.createUserIntoDb(req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "User Registered successfully!",
    data: result,
  });
});

// get all user form db
const getUsers = catchAsync(async (req: Request, res: Response) => {
  const filters = pick(req.query, userFilterableFields);
  const options = pick(req.query, ["limit", "page", "sortBy", "sortOrder"]);

  const result = await userService.getUsersFromDb(filters, options);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Users retrieve successfully!",
    data: result,
  });
});

// get all user form db
const updateProfile = catchAsync(
  async (req: Request & { user?: any }, res: Response) => {
    const user = req?.user;

    const result = await userService.updateProfile(req);
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Profile updated successfully!",
      data: result,
    });
  }
);

const getSingleUserFromDb = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id;
  const result = await userService.getSingleUserFromDb(id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "User retrieved successfully!",
    data: result,
  });
});
// *! update user role and account status
const updateUser = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id;
  const result = await userService.updateUserIntoDb(req.body, id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "User updated successfully!",
    data: result,
  });
});
const calculatePrice = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id;
  const result = await userService.calculatePrice(req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "User updated successfully!",
    data: result,
  });
});
const contactMail = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id;
  const result = await userService.contactMail(req);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "send successfully!",
    data: result,
  });
});
const completeDriverProfile = catchAsync(
  async (req: Request, res: Response) => {
    const result = await userService.completeDriverProfile(req);
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "action successfully!",
      data: result,
    });
  }
);
const completeUserProfile = catchAsync(async (req: Request, res: Response) => {
  const result = await userService.completeUserProfile(req);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "actions successfully!",
    data: result,
  });
});
const completeMerchantProfile = catchAsync(
  async (req: Request, res: Response) => {
    const result = await userService.completeMerchantProfile(req);
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "actions successfully!",
      data: result,
    });
  }
);
const completeWareHouseProfile = catchAsync(
  async (req: Request, res: Response) => {
    const result = await userService.completeWareHouseProfile(req);
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "actions successfully!",
      data: result,
    });
  }
);
const approvedUser = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id;
  const result = await userService.approvedUser(id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "actions successfully!",
    data: result,
  });
});
const deleteUserAndRelations = catchAsync(
  async (req: Request, res: Response) => {
    const id = req.params.id;
    const result = await userService.deleteUserAndRelations(id);
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "actions successfully!",
      data: result,
    });
  }
);
const removeProfileImage = catchAsync(async (req: Request, res: Response) => {
  const id = req.user.id;
  const result = await userService.removeProfileImage(id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Profile image removed successfully!",
    data: result,
  });
});

export const userController = {
  createUser,
  getUsers,
  updateProfile,
  updateUser,
  calculatePrice,
  completeDriverProfile,
  completeUserProfile,
  completeMerchantProfile,
  completeWareHouseProfile,
  contactMail,
  getSingleUserFromDb,
  approvedUser,
  deleteUserAndRelations,
  removeProfileImage
};

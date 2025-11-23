import httpStatus from "http-status";
import { AdminService } from "./Admin.service";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";

const createAdmin = catchAsync(async (req, res) => {
  const result = await AdminService.createIntoDb();
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Admin created successfully",
    data: result,
  });
});

const getAdminList = catchAsync(async (req, res) => {
  const result = await AdminService.getListFromDb();
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Admin list retrieved successfully",
    data: result,
  });
});

const getAdminById = catchAsync(async (req, res) => {
  const result = await AdminService.getByIdFromDb(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Admin details retrieved successfully",
    data: result,
  });
});

const updateAdmin = catchAsync(async (req, res) => {
  const result = await AdminService.updateIntoDb(req.params.id, req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Admin updated successfully",
    data: result,
  });
});

const deleteAdmin = catchAsync(async (req, res) => {
  const result = await AdminService.deleteItemFromDb(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Admin deleted successfully",
    data: result,
  });
});
const getAllCount = catchAsync(async (req, res) => {
  const result = await AdminService.getAllCount();
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "get all count successfully",
    data: result,
  });
});
const getAllNewRequest = catchAsync(async (req, res) => {
  const result = await AdminService.getAllNewRequest();
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "get all reviewed Data successfully",
    data: result,
  });
});
const confirmParcel = catchAsync(async (req, res) => {
  const requestId = req.params.id;
  const result = await AdminService.confirmParcel(requestId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "accept request successfully",
    data: result,
  });
});
const cancelParcel = catchAsync(async (req, res) => {
  const requestId = req.params.id;
  const result = await AdminService.cancelParcel(requestId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "reject request successfully",
    data: result,
  });
});
const findRiderBaseParcelLocations = catchAsync(async (req, res) => {
  const requestId = req.params.id;
  const result = await AdminService.findRiderBaseParcelLocations(requestId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "find rider successfully",
    data: result,
  });
});
const SendRiderRequest = catchAsync(async (req, res) => {
  req.body.assignId=req.user.id;
  const data = req.body;
  
  const result = await AdminService.SendRiderRequest(data);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "assign ride successfully",
    data: result,
  });
});
const rideRequestAccept = catchAsync(async (req, res) => {
  const requestId = req.params.id;
  const result = await AdminService.rideRequestAccept(requestId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "rider request successfully",
    data: result,
  });
});
const getAllPendingRideRequests = catchAsync(async (req, res) => {
  const result = await AdminService.getAllPendingRideRequests();
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "get rider request successfully",
    data: result,
  });
});
const getAllAcceptedRideRequests = catchAsync(async (req, res) => {
  const result = await AdminService.getAllAcceptedRideRequests();
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "get rider request successfully",
    data: result,
  });
});
const getAllRejectedRideRequests = catchAsync(async (req, res) => {
  const result = await AdminService.getAllRejectedRideRequests();
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "get rider request successfully",
    data: result,
  });
});

// cancel rideRequest 
const cancelRideRequest = catchAsync(async (req, res) => {
  const result = await AdminService.cancelRideRequest(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "cancel rider request successfully",
    data: result,
  });
});
const report = catchAsync(async (req, res) => {
  const result = await AdminService.report();
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "get report  successfully",
    data: result,
  });
});
const findAllRider = catchAsync(async (req, res) => {
  const result = await AdminService.findAllRider();
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "get all rider successfully",
    data: result,
  });
});

export const AdminController = {
  createAdmin,
  getAdminList,
  getAdminById,
  updateAdmin,
  deleteAdmin,
  getAllCount,
  getAllNewRequest,
  confirmParcel,
  cancelParcel,
  findRiderBaseParcelLocations,
  SendRiderRequest,
  rideRequestAccept,
  getAllPendingRideRequests,
  getAllAcceptedRideRequests,
  getAllRejectedRideRequests,
  cancelRideRequest,
  findAllRider,
  report
};

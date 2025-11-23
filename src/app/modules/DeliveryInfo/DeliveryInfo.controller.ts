import httpStatus from "http-status";
import catchAsync from "../../../shared/catchAsync";
import { deliveryInfoService } from "./DeliveryInfo.service";
import sendResponse from "../../../shared/sendResponse";
import pick from "../../../shared/pick";

const createDeliveryInfo = catchAsync(async (req, res) => {
  req.body.userId = req.user.id;
  const result = await deliveryInfoService.createIntoDb(req.body);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "DeliveryInfo created successfully",
    data: result,
  });
});

const getDeliveryInfoList = catchAsync(async (req, res) => {
    const filters = pick(req.query, ["status","searchTerm"]);
  const result = await deliveryInfoService.getListFromDb(filters);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "DeliveryInfo list retrieved successfully",
    data: result,
  });
});

const getDeliveryInfoById = catchAsync(async (req, res) => {
  const result = await deliveryInfoService.getByIdFromDb(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "DeliveryInfo details retrieved successfully",
    data: result,
  });
});

const updateDeliveryInfo = catchAsync(async (req, res) => {
  const result = await deliveryInfoService.updateIntoDb(
    req.params.id,
    req.body
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "DeliveryInfo updated successfully",
    data: result,
  });
});

const deleteDeliveryInfo = catchAsync(async (req, res) => {
  const result = await deliveryInfoService.deleteItemFromDb(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "DeliveryInfo deleted successfully",
    data: result,
  });
});
const payment = catchAsync(async (req, res) => {
  const result = await deliveryInfoService.payment(req.user.id, req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "payment successfully",
    data: result,
  });
});
const createPaymentInfo = catchAsync(async (req, res) => {
  req.body.userId = req.user.id;
  const result = await deliveryInfoService.createPaymentInfo(req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "payment successfully",
    data: result,
  });
});
const getRideRequestBasedOnRider = catchAsync(async (req, res) => {
  const result = await deliveryInfoService.getRideRequestBasedOnRider(
    req.user.id,
    req.query
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "get Ride Request Based On Rider successfully",
    data: result,
  });
});
const acceptRideRequestByDriver = catchAsync(async (req, res) => {
  const result = await deliveryInfoService.acceptRideRequestByDriver(
    req.params.id
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "get ride request by rider  successfully",
    data: result,
  });
});
const rejectRideRequestByDriver = catchAsync(async (req, res) => {
  const result = await deliveryInfoService.rejectRideRequestByDriver(
    req.params.id,
    req.body.rejectionReason
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "reject successfully",
    data: result,
  });
});
const getParcelLocationWithRider = catchAsync(async (req, res) => {
  
  const result = await deliveryInfoService.getParcelLocationWithRider(
    req.params.parcelId,
    req.user.id
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "get parcel location successfully",
    data: result,
  });
});
const completeDelivery = catchAsync(async (req, res) => {
  
  const result = await deliveryInfoService.completeDelivery(
    req.body.parcelId,
   
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "complete parcel successfully",
    data: result,
  });
});
const getAllTrackingListByParcel = catchAsync(async (req, res) => {
  
  const result = await deliveryInfoService.getAllTrackingListByParcel(
    req.params.parcelId,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "get parcel track successfully",
    data: result,
  });
});
const getSingleRideRequest = catchAsync(async (req, res) => {
  
  const result = await deliveryInfoService.getSingleRideRequest(
    req.params.id,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "get parcel track successfully",
    data: result,
  });
});
const searchParcel = catchAsync(async (req, res) => {
  
  const result = await deliveryInfoService.searchParcel(
    req.params.id,
    req.user.id
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "get parcel successfully",
    data: result,
  });
});
const getUserBaseParcel = catchAsync(async (req, res) => {

  const result = await deliveryInfoService.getUserBaseParcel(
    req.user.id
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "get parcel successfully",
    data: result,
  });
});

const updateDriverLocation = catchAsync(async (req, res) => {
  const { latitude, longitude } = req.body;
  const result = await deliveryInfoService.updateDriverLocation(
    req.user.id,
    latitude,
    longitude
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Driver location updated successfully",
    data: result,
  });
});

export const DeliveryInfoController = {
  createDeliveryInfo,
  getDeliveryInfoList,
  getDeliveryInfoById,
  updateDeliveryInfo,
  deleteDeliveryInfo,
  payment,
  createPaymentInfo,
  getAllTrackingListByParcel,
  getRideRequestBasedOnRider,
  acceptRideRequestByDriver,
  rejectRideRequestByDriver,
  getParcelLocationWithRider,
  completeDelivery,
  getSingleRideRequest,
  searchParcel,
  getUserBaseParcel,
  updateDriverLocation,
};

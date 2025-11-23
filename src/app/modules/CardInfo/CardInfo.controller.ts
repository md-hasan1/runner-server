import httpStatus from "http-status";
import { cardInfoService } from "./CardInfo.service";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";

const createCardInfo = catchAsync(async (req, res) => {
  const result = await cardInfoService.createIntoDb(req.body, req.user.id);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "CardInfo created successfully",
    data: result,
  });
});

const getCardInfoList = catchAsync(async (req, res) => {
  const result = await cardInfoService.getListFromDb();
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "CardInfo list retrieved successfully",
    data: result,
  });
});

const getCardInfoById = catchAsync(async (req, res) => {
  const result = await cardInfoService.getByIdFromDb(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "CardInfo details retrieved successfully",
    data: result,
  });
});

const updateCardInfo = catchAsync(async (req, res) => {
  const result = await cardInfoService.updateIntoDb(req.params.id, req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "CardInfo updated successfully",
    data: result,
  });
});

const deleteCardInfo = catchAsync(async (req, res) => {
  const result = await cardInfoService.deleteItemFromDb(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "CardInfo deleted successfully",
    data: result,
  });
});
const getCardInfoBaseUser = catchAsync(async (req, res) => {
  const result = await cardInfoService.getCardInfoBaseUser(req.user.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "CardInfo get successfully",
    data: result,
  });
});
const getCardInfoBaseUserId = catchAsync(async (req, res) => {
  const result = await cardInfoService.getCardInfoBaseUser(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "CardInfo get successfully",
    data: result,
  });
});

export const CardInfoController = {
  createCardInfo,
  getCardInfoList,
  getCardInfoById,
  updateCardInfo,
  deleteCardInfo,
  getCardInfoBaseUser,
  getCardInfoBaseUserId
};

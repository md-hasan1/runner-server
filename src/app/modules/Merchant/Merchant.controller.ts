import httpStatus from 'http-status';

import { MerchantService } from './Merchant.service';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import pick from '../../../shared/pick';

const createMerchant = catchAsync(async (req, res) => {
  const result = await MerchantService.createIntoDb(req.body);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Merchant created successfully',
    data: result,
  });
});

const getMerchantList = catchAsync(async (req, res) => {
  const params=pick(req.query,["status"])
  const result = await MerchantService.getListFromDb(params);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Merchant list retrieved successfully',
    data: result,
  });
});

const getMerchantById = catchAsync(async (req, res) => {
  const result = await MerchantService.getByIdFromDb(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Merchant details retrieved successfully',
    data: result,
  });
});

const updateMerchant = catchAsync(async (req, res) => {
  const result = await MerchantService.updateIntoDb(req.params.id, req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Merchant updated successfully',
    data: result,
  });
});

const deleteMerchant = catchAsync(async (req, res) => {
  const result = await MerchantService.deleteItemFromDb(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Merchant deleted successfully',
    data: result,
  });
});
const makePaymentRequest = catchAsync(async (req, res) => {
  req.body.userId=req.user.id
  const result = await MerchantService.makePaymentRequest(req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'payment request successfully',
    data: result,
  });
});
const getReport = catchAsync(async (req, res) => {
  
  const result = await MerchantService.getReport(req.user.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'get report successfully',
    data: result,
  });
});

const getMyPaymentRequest = catchAsync(async (req, res) => {
  const result = await MerchantService.getMyPaymentRequest(req.user.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'get my payment request successfully',
    data: result,
  });
}); 
export const MerchantController = {
  createMerchant,
  getMerchantList,
  makePaymentRequest,
  getMerchantById,
  updateMerchant,
  deleteMerchant,
  getReport,
  getMyPaymentRequest
};
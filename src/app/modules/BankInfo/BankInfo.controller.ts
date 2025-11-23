import httpStatus from 'http-status';
import catchAsync from '../../../shared/catchAsync';
import { bankInfoService } from './BankInfo.service';
import sendResponse from '../../../shared/sendResponse';


const createBankInfo = catchAsync(async (req, res) => {
  const result = await bankInfoService.createIntoDb(req.body,req.user.id);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'BankInfo created successfully',
    data: result,
  });
});

const getBankInfoList = catchAsync(async (req, res) => {
  const result = await bankInfoService.getListFromDb();
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'BankInfo list retrieved successfully',
    data: result,
  });
});

const getBankInfoById = catchAsync(async (req, res) => {
  const result = await bankInfoService.getByIdFromDb(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'BankInfo details retrieved successfully',
    data: result,
  });
});

const updateBankInfo = catchAsync(async (req, res) => {
  const result = await bankInfoService.updateIntoDb(req.params.id, req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'BankInfo updated successfully',
    data: result,
  });
});

const deleteBankInfo = catchAsync(async (req, res) => {
  const result = await bankInfoService.deleteItemFromDb(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'BankInfo deleted successfully',
    data: result,
  });
});
const getBankInfoBaseUser = catchAsync(async (req, res) => {
  const result = await bankInfoService.getBankInfoBaseUser(req.user.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'BankInfo get base successfully',
    data: result,
  });
});
const getBankInfoBaseUserId = catchAsync(async (req, res) => {
  const result = await bankInfoService.getBankInfoBaseUser(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'BankInfo get base successfully',
    data: result,
  });
});

export const BankInfoController = {
  createBankInfo,
  getBankInfoList,
  getBankInfoById,
  updateBankInfo,
  deleteBankInfo,
  getBankInfoBaseUser,
  getBankInfoBaseUserId
};
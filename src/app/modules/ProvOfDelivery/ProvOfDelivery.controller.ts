import httpStatus from 'http-status';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { provOfDeliveryService } from './ProvOfDelivery.service';

const createProvOfDelivery = catchAsync(async (req, res) => {
  const result = await provOfDeliveryService.createIntoDb(req);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'ProvOfDelivery created successfully',
    data: result,
  });
});

const getProvOfDeliveryList = catchAsync(async (req, res) => {
  const result = await provOfDeliveryService.getListFromDb();
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'ProvOfDelivery list retrieved successfully',
    data: result,
  });
});

const getProvOfDeliveryById = catchAsync(async (req, res) => {
  const result = await provOfDeliveryService.getByIdFromDb(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'ProvOfDelivery details retrieved successfully',
    data: result,
  });
});

const updateProvOfDelivery = catchAsync(async (req, res) => {
  const result = await provOfDeliveryService.updateIntoDb(req.params.id, req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'ProvOfDelivery updated successfully',
    data: result,
  });
});

const deleteProvOfDelivery = catchAsync(async (req, res) => {
  const result = await provOfDeliveryService.deleteItemFromDb(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'ProvOfDelivery deleted successfully',
    data: result,
  });
});

export const ProvOfDeliveryController = {
  createProvOfDelivery,
  getProvOfDeliveryList,
  getProvOfDeliveryById,
  updateProvOfDelivery,
  deleteProvOfDelivery,
};
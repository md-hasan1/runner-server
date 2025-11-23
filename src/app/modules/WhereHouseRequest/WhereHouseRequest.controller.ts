import httpStatus from 'http-status';
import catchAsync from '../../../shared/catchAsync';
import { whereHouseRequestService } from './WhereHouseRequest.service';
import sendResponse from '../../../shared/sendResponse';
import pick from '../../../shared/pick';


const createWhereHouseRequest = catchAsync(async (req, res) => {
  const result = await whereHouseRequestService.createIntoDb(req.body.parcelId, req.user.id);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'WhereHouseRequest created successfully',
    data: result,
  });
});

const getReceivedParcel = catchAsync(async (req, res) => {
  const filters=pick(req.query, ['status']);
  const result = await whereHouseRequestService.getReceivedParcel(filters,req.user.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'WhereHouseRequest list retrieved successfully',
    data: result,
  });
});

const getWhereHouseRequestById = catchAsync(async (req, res) => {
  const result = await whereHouseRequestService.getByIdFromDb(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'WhereHouseRequest details retrieved successfully',
    data: result,
  });
});

const updateWhereHouseRequest = catchAsync(async (req, res) => {
  const result = await whereHouseRequestService.updateIntoDb(req.params.id, req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'WhereHouseRequest updated successfully',
    data: result,
  });
});

const deleteWhereHouseRequest = catchAsync(async (req, res) => {
  const result = await whereHouseRequestService.deleteItemFromDb(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'WhereHouseRequest deleted successfully',
    data: result,
  });
});
const whereHouseParcelSend = catchAsync(async (req, res) => {
  const result = await whereHouseRequestService.whereHouseParcelSend(req.body.requestId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'WhereHouseRequest parcel send successfully',
    data: result,
  });
});
const afterPaymentChangeStatus = catchAsync(async (req, res) => {
  const result = await whereHouseRequestService.afterPaymentChangeStatus(req.body.requestId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'status changed successfully',
    data: result,
  });
});
const payLetter = catchAsync(async (req, res) => {
  const result = await whereHouseRequestService.payLetter(req.body.requestId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'status changed successfully',
    data: result,
  });
});
const makeInvoiceForAdmin = catchAsync(async (req, res) => {
  const result = await whereHouseRequestService.makeInvoiceForAdmin();

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=admin_invoice.pdf");
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Invoice created successfully',
    data: result,
  });
});

export const WhereHouseRequestController = {
  createWhereHouseRequest,
  getReceivedParcel,
  getWhereHouseRequestById,
  updateWhereHouseRequest,
  deleteWhereHouseRequest,
  whereHouseParcelSend,
  afterPaymentChangeStatus,
  payLetter,
  makeInvoiceForAdmin,
};
import { getLatLngFromPostalCode } from "./../../../shared/getLatLong";
import { Prisma, User, UserRole } from "@prisma/client";
import * as bcrypt from "bcrypt";
import { Request } from "express";
import httpStatus from "http-status";
import { Secret } from "jsonwebtoken";
import config from "../../../config";
import ApiError from "../../../errors/ApiErrors";
import { fileUploader } from "../../../helpars/fileUploader";
import { jwtHelpers } from "../../../helpars/jwtHelpers";
import { paginationHelper } from "../../../helpars/paginationHelper";
import { IPaginationOptions } from "../../../interfaces/paginations";
import { calculateRunCourierPrice2 } from "../../../shared/calculate2";
import {
  calculateRunCourierPrice,
  DeliveryRequestInput,
} from "../../../shared/calculatePrice";
import emailSender3 from "../../../shared/generalMailSender";
import prisma from "../../../shared/prisma";
import { userSearchAbleFields } from "./user.costant";
import { IUser, IUserFilterRequest } from "./user.interface";
import { sendSingleNotificationUtils } from "../Notification/Notification.service";

// Create a new user in the database.
const createUserIntoDb = async (payload: User) => {
  const existingUser = await prisma.user.findFirst({
    where: {
      email: payload.email,
    },
  });

  if (existingUser) {
    if (existingUser.email === payload.email) {
      throw new ApiError(
        400,
        `User with this email ${payload.email} already exists`
      );
    }
  }
  const hashedPassword: string = await bcrypt.hash(
    payload.password,
    Number(config.bcrypt_salt_rounds)
  );

  const result = await prisma.user.create({
    data: { ...payload, password: hashedPassword },
    select: {
      id: true,
      email: true,
      phoneNumber: true,
      profileImage: true,
      role: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  const accessToken = jwtHelpers.generateToken(
    {
      id: result.id,
      email: result.email,
      role: result.role,
    },
    config.jwt.jwt_secret as Secret,
    config.jwt.expires_in as string
  );
  return { result, accessToken };
};

const getUsersFromDb = async (
  params: IUserFilterRequest,
  options: IPaginationOptions
) => {
  const { page, limit, skip } = paginationHelper.calculatePagination(options);
  const { searchTerm, isApproved, ...filterData } = params;

  const andConditions: Prisma.UserWhereInput[] = [];

  if (searchTerm) {
    andConditions.push({
      OR: userSearchAbleFields.map((field) => ({
        [field]: {
          contains: searchTerm,
          mode: "insensitive",
        },
      })),
    });
  }

  if (Object.keys(filterData).length > 0) {
    Object.entries(filterData).forEach(([key, value]) => {
      if (key === "role") {
        if (!Object.values(UserRole).includes(value as UserRole)) {
          throw new Error(
            `Invalid role: ${value}. Allowed values: ${Object.values(
              UserRole
            ).join(", ")}`
          );
        }
        andConditions.push({ role: value as UserRole });
      } else if (key === "isApproved" || key === "isCompleted") {
        const boolValue = value === "true";
        andConditions.push({ [key]: boolValue });
      } else {
        andConditions.push({ [key]: { equals: value } });
      }
    });
  }

  const isMerchant = filterData.role?.toUpperCase() === UserRole.MERCHANT;
  if (isApproved !== undefined) {
    const isApprovedBool = isApproved === "true";
    andConditions.push({
      isApproved: isApprovedBool,
    });
  }

  const whereConditions: Prisma.UserWhereInput = { AND: andConditions };

  // console.dir(whereConditions, { depth: Infinity });

  // await prisma.merchant.updateMany({where:{},data:{amount:0}})
  const result = await prisma.user.findMany({
    where: whereConditions,
    skip,
    orderBy:
      options.sortBy && options.sortOrder
        ? { [options.sortBy]: options.sortOrder }
        : { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      isApproved: true,
      isCompleted: true,
      profileImage: true,
      fullName: true,
      phoneNumber: true,
      location: true,
      postalCode: true,
      role: true,
      createdAt: true,
      updatedAt: true,
      merchant: {
        select: {
          id: true,
          amount: true,
        },
      },
      parcel: isMerchant ? { select: { id: true } } : false,
    },
  });

  const total = await prisma.user.count({
    where: whereConditions,
  });

  return {
    meta: {
      page,
      limit,
      total,
    },
    data: result,
  };
};

const getSingleUserFromDb = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      id: true,
      email: true,
      fullName: true,
      profileImage: true,
      phoneNumber: true,
      location: true,
      postalCode: true,

      isApproved: true,
      isCompleted: true,
      role: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) {
    throw new ApiError(404, "User not found");
  }
  let profile = null;
  if (user.role === UserRole.DELIVERYPERSON) {
    profile = await prisma.driverProfile.findFirst({
      where: {
        userId: user.id,
      },
    });
  } else if (user.role === UserRole.MERCHANT) {
    profile = await prisma.merchant.findFirst({
      where: {
        userId: user.id,
      },
    });
  }

  return { user, profile };
};

// update profile by user won profile uisng token or email and id
const updateProfile = async (req: Request) => {
  const file = req.file;
  const stringData = req.body.data;
  let image;
  let parseData;
  const existingUser = await prisma.user.findFirst({
    where: {
      id: req.user.id,
    },
  });
  if (!existingUser) {
    throw new ApiError(404, "User not found");
  }
  if (file) {
    image = (await fileUploader.uploadToLocal(file)).Location;
  }
  if (stringData) {
    parseData = JSON.parse(stringData);
  }
  const result = await prisma.user.update({
    where: {
      id: existingUser.id, // Ensure `existingUser.id` is valid and exists
    },
    data: {
      // email: parseData.email || existingUser.email,
      fullName: parseData?.fullName || existingUser.fullName,
      phoneNumber: parseData?.phoneNumber || existingUser.phoneNumber,
      location: parseData?.location || existingUser.location,
      postalCode: parseData?.postalCode || existingUser.postalCode,
      profileImage:
        image !== undefined && image !== null
          ? image
          : parseData?.profileImage ?? existingUser.profileImage,
      updatedAt: new Date(), // Assuming your model has an `updatedAt` field
    },
    select: {
      id: true,

      email: true,
      profileImage: true,
    },
  });

  return result;
};

// update user data into database by id fir admin
const updateUserIntoDb = async (payload: IUser, id: string) => {
  const userInfo = await prisma.user.findUniqueOrThrow({
    where: {
      id: id,
    },
  });
  if (!userInfo)
    throw new ApiError(httpStatus.NOT_FOUND, "User not found with id: " + id);

  const result = await prisma.user.update({
    where: {
      id: userInfo.id,
    },
    data: payload,
    select: {
      id: true,

      email: true,
      profileImage: true,
      role: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!result)
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Failed to update user profile"
    );

  return result;
};
const calculatePrice = async (input: DeliveryRequestInput) => {
  const result = await calculateRunCourierPrice(input);
  const result2 = await calculateRunCourierPrice2(input);

  return { result, result2 };
};

const contactMail = async (req: Request) => {
  const { email, firstName, lastName, phone, subject, message } = req.body;

  if (!email || !subject || !message || !firstName || !lastName || !phone) {
    throw new ApiError(
      400,
      "All fields are required: email, name, phone, subject, and message"
    );
  }

  const generateEmailHTML = (
    email: string,
    firstName: string,
    lastName: string,
    phone: string,
    subject: string,
    message: string
  ): string => {
    return `
    <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; background-color: #f9f9f9;">
      <div style="max-width: 600px; margin: auto; background-color: #ffffff; border-radius: 8px; padding: 30px; box-shadow: 0 0 10px rgba(0,0,0,0.05);">
        <h2 style="color:rgb(216, 69, 69);">📬 New Support Message</h2>

        <p><strong>From:</strong> ${firstName} ${lastName}</p>
        <p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
        <p><strong>Phone:</strong> ${phone}</p>
        <p><strong>Subject:</strong> ${subject}</p>

        <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;" />

        <p style="white-space: pre-line;">${message}</p>

        <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;" />

        <footer>
          <p>This email was sent via the Run Courier contact form system.</p>
        </footer>
      </div>
    </div>
  `;
  };

  console.log("📨 contactMail →", {
    email,
    firstName,
    lastName,
    phone,
    subject,
    message,
  });

  const html = generateEmailHTML(
    email,
    firstName,
    lastName,
    phone,
    subject,
    message
  );

  await emailSender3(email, html, subject);

  return { success: true, message: "Email sent successfully" };
};

// const completeDriverProfile = async (req: Request) => {
//   const userId = req.user.id;
//   const isExistUser = await prisma.user.findFirst({ where: { id: userId } });
//   if (!isExistUser) {
//     throw new ApiError(httpStatus.NOT_FOUND, "User not found");
//   }
//   if (isExistUser.role !== UserRole.DELIVERYPERSON) {
//     throw new ApiError(httpStatus.NOT_ACCEPTABLE, "You are not Driver");
//   }
//   const profileData = req.body.profileData;
//   let parsedData;

//   if (profileData) {
//     try {
//       parsedData = JSON.parse(profileData);
//     } catch (err) {
//       throw new ApiError(400, "Invalid JSON in profileData");
//     }
//   }

//   const {
//     serviceType,
//     companyName,
//     phoneNumber,
//     fullName,
//     location,
//     postalCode,
//     registrationNumber,
//   } = parsedData;

//   const requiredFields = [
//     "profileimage",
//     "personalIdentification",
//     "proofOfAddress",
//     "ukDrivingLicenseFront",
//     "ukDrivingLicenseBack",
//     "insuranceCertificate",
//     "motCertificate",
//     "nationalInsuranceDocument",
//     "shearCode",
//     "dbsCertificate",
//     "vehiclePhotoFront",
//     "vehiclePhotoBack",
//     "vehiclePhotoRight",
//     "vehiclePhotoLeft",
//     "vehicleCargoArea",
//     "speedometerMileage",
//   ];

//   const fileMap: Record<string, string> = {};

//   const files = req.files as { [fieldname: string]: Express.Multer.File[] };

//   for (const field of requiredFields) {
//     const fileArray = files?.[field];
//     const file = fileArray?.[0]; // Grab the first file for this field

//     if (!file) {
//       throw new ApiError(400, `Missing required file: ${field}`);
//     }

//     const uploadResult = await fileUploader.uploadToDigitalOcean(file);
//     fileMap[field] = uploadResult.Location;
//   }

//   // 🔄 Update user basic info
//   await prisma.user.update({
//     where: { id: userId },
//     data: {
//       phoneNumber,
//       profileImage: fileMap["profileimage"],
//       postalCode: postalCode,
//       fullName: fullName,
//       location: location,
//       isCompleted: true,
//     },
//   });

//   const isAlreadyCompleted = await prisma.driverProfile.findFirst({
//     where: userId,
//   });
//   if (isAlreadyCompleted) {
//     throw new ApiError(
//       httpStatus.NOT_ACCEPTABLE,
//       "You profile AllReady Completed. you can update your profile"
//     );
//   }
//   // 🆕 Create DriverProfile
//   const result = await prisma.driverProfile.create({
//     data: {
//       userId,
//       serviceType,
//       companyName,
//       registrationNumber,
//       personalIdentification: fileMap["personalIdentification"],
//       proofOfAddress: fileMap["proofOfAddress"],
//       ukDrivingLicenseFront: fileMap["ukDrivingLicenseFront"],
//       ukDrivingLicenseBack: fileMap["ukDrivingLicenseBack"],
//       insuranceCertificate: fileMap["insuranceCertificate"],
//       motCertificate: fileMap["motCertificate"],
//       nationalInsuranceDocument: fileMap["nationalInsuranceDocument"],
//       shearCode: fileMap["shearCode"],
//       dbsCertificate: fileMap["dbsCertificate"],
//       vehiclePhotoFront: fileMap["vehiclePhotoFront"],
//       vehiclePhotoBack: fileMap["vehiclePhotoBack"],
//       vehiclePhotoRight: fileMap["vehiclePhotoRight"],
//       vehiclePhotoLeft: fileMap["vehiclePhotoLeft"],
//       vehicleCargoArea: fileMap["vehicleCargoArea"],
//       speedometerMileage: fileMap["speedometerMileage"],
//     },
//   });

//   return result;
// };

const completeDriverProfile = async (req: Request) => {
  const userId = req.user.id;

  const isExistUser = await prisma.user.findFirst({ where: { id: userId } });
  if (!isExistUser) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }

  if (isExistUser.role !== UserRole.DELIVERYPERSON) {
    throw new ApiError(httpStatus.NOT_ACCEPTABLE, "You are not a Driver");
  }

  const profileData = req.body.profileData;
  let parsedData;

  if (profileData) {
    try {
      parsedData = JSON.parse(profileData);
    } catch (err) {
      throw new ApiError(400, "Invalid JSON in profileData");
    }
  }

  const {
    serviceType,
    companyName,
    phoneNumber,
    fullName,
    location,
    postalCode,
    registrationNumber,
  } = parsedData || {};

  const requiredFields = [
    "profileImage",
    "personalIdentification",
    "proofOfAddress",
    "ukDrivingLicenseFront",
    "ukDrivingLicenseBack",
    "insuranceCertificate",
    "motCertificate",
    "nationalInsuranceDocument",
    "shearCode",
    "dbsCertificate",
    "vehiclePhotoFront",
    "vehiclePhotoBack",
    "vehiclePhotoRight",
    "vehiclePhotoLeft",
    "vehicleCargoArea",
    "speedometerMileage",
  ];

  const files = req.files as { [fieldname: string]: Express.Multer.File[] };
  const fileMap: Record<string, string> = {};

  const existingProfile = await prisma.driverProfile.findFirst({
    where: { userId },
  });

  const isCreate = !existingProfile;

  for (const field of requiredFields) {
    const fileArray = files?.[field];
    const file = fileArray?.[0];

    if (file) {
      const uploadResult = await fileUploader.uploadToLocal(file);
      fileMap[field] = uploadResult.Location;
    } else if (isCreate) {
      // Required only on create
      throw new ApiError(400, `Missing required file: ${field}`);
    }
  }

  const { longitude, latitude } = await getLatLngFromPostalCode(
    postalCode,
    "UK"
  );

  // Always update user fields if provided
  await prisma.user.update({
    where: { id: userId },
    data: {
      ...(phoneNumber && { phoneNumber }),
      ...(fullName && { fullName }),

      ...(postalCode && { postalCode }),
      ...(location && { location }),
      ...(fileMap["profileImage"] && { profileImage: fileMap["profileImage"] }),
      isCompleted: true,
    },
  });

  // console.log(fileMap);

  const profilePayload: any = {
    ...(serviceType ? { serviceType } : {}),
    ...(longitude && { longitude:String(longitude) }),
    ...(latitude && { latitude:String(longitude) }),
    ...(companyName ? { companyName } : {}),
    ...(registrationNumber ? { registrationNumber } : {}),
    ...Object.entries(fileMap).reduce<Record<string, any>>(
      (acc, [key, value]) => {
        if (key !== "profileImage") {
          acc[key] = value;
        }
        return acc;
      },
      {}
    ),
  };

  let result;
  if (existingProfile) {
    // Update: Only update what's sent
    result = await prisma.driverProfile.update({
      where: { id: existingProfile.id },
      data: profilePayload,
    });
  } else {
    // Create: All required already validated
    result = await prisma.driverProfile.create({
      data: {
        userId,
        ...profilePayload,
      },
    });
  }

  // send push notification to admin for new driver profile completion
const admin = await prisma.user.findFirst({ where: { role: UserRole.ADMIN } });
if(admin&&!isExistUser.isCompleted){
    console.log("Admin found for notification:", admin.id);
    try {
      await sendSingleNotificationUtils({
        userId: admin.id,
        senderId: userId,
        title: "New Driver Profile Completed",
        body: `Driver ${fullName || "N/A"} has completed their profile.`,
      });
    } catch (err: any) {
      // Log and continue — notification failure shouldn't block profile completion
      console.error('Failed to send admin notification for driver profile completion:', err?.message || err);
    }
}


  return result;
};

// const completeUserProfile = async (req: Request) => {
//   const profileData = req.body.data;
//   const file = req.file;
//   const userId = req.user.id;

//   const isExistUser = await prisma.user.findFirst({ where: { id: userId } });
//   if (!isExistUser) {
//     throw new ApiError(httpStatus.NOT_FOUND, "user not found");
//   }
//   if (!profileData) {
//     throw new ApiError(httpStatus.NOT_FOUND, "profile Data not found");
//   }
//   if (!file) {
//     throw new ApiError(httpStatus.NOT_FOUND, "profile image not found");
//   }
//   const parsedata = JSON.parse(profileData);
//   const image = (await fileUploader.uploadToDigitalOcean(file)).Location;

//   const updateUser = await prisma.user.update({
//     where: { id: userId },
//     data: {
//       profileImage: image,
//       ...parsedata,
//     },

//     select: {
//       id: true,
//       email: true,
//       fullName: true,
//       phoneNumber: true,
//       profileImage: true,
//       location: true,
//       postalCode: true,
//       isCompleted: true,
//       role: true,
//       createdAt: true,
//       updatedAt: true,
//     },
//   });

//   return updateUser;
// };

const completeUserProfile = async (req: Request) => {
  const profileData = req.body.data;
  const file = req.file;
  const userId = req.user.id;

  // 🔎 Check if user exists
  const isExistUser = await prisma.user.findFirst({ where: { id: userId } });
  if (!isExistUser) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }

  // 📦 Parse profile data safely
  let parsedData = {};
  if (profileData) {
    try {
      parsedData = JSON.parse(profileData);
    } catch (err) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        "Invalid JSON in profile data"
      );
    }
  }

  // 📷 Upload image if file is present
  let imageUrl = undefined;
  if (file) {
    const uploaded = await fileUploader.uploadToLocal(file);
    imageUrl = uploaded.Location;
  }

  // 🛠️ Build the update payload
  const updatePayload: any = {
    ...parsedData,
    ...(imageUrl && { profileImage: imageUrl }),
    isCompleted: true,
  };

  // ✅ Update the user with whatever fields are sent
  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: updatePayload,
    select: {
      id: true,
      email: true,
      fullName: true,
      phoneNumber: true,
      profileImage: true,
      location: true,
      postalCode: true,
      isCompleted: true,
      role: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return updatedUser;
};

// const completeMerchantProfile = async (req: Request) => {
//   console.log("completeMerchantProfile");
//   const data = req.body.data;
//   const file = req.file;
//   const userId = req.user.id;
//   if (!userId) {
//     throw new ApiError(httpStatus.NOT_FOUND, "user id not found");
//   }
//   const isExistUser = await prisma.user.findFirst({ where: { id: userId } });
//   const isMerchantExist = await prisma.merchant.findFirst({
//     where: { userId: userId },
//   });
//   if (isMerchantExist) {
//     throw new ApiError(
//       httpStatus.NOT_ACCEPTABLE,
//       "You allReady completeMerchant profile now you can update your profile"
//     );
//   }
//   if (!isExistUser) {
//     throw new ApiError(httpStatus.NOT_FOUND, "User not found");
//   }
//   if (!data) {
//     throw new ApiError(httpStatus.NOT_FOUND, "profile data is required");
//   }
//   if (!file) {
//     throw new ApiError(httpStatus.NOT_FOUND, "profile Image is required");
//   }
//   const parseData = JSON.parse(data);
//   const {
//     companyName,
//     tradingName,
//     registeredNumber,
//     registeredAddress,
//     primaryPersonContact,
//     location,
//     postalCode,
//   } = parseData;
//   const image = (await fileUploader.uploadToDigitalOcean(file)).Location;

//   const updateUser = await prisma.user.update({
//     where: { id: userId },
//     data: {
//       isCompleted: true,
//       fullName: companyName,
//       postalCode: postalCode,
//       location: location,
//       profileImage: image,
//     },
//   });

//   const createMerchantProfile = await prisma.merchant.create({
//     data: {
//       userId: userId,
//       tradingName: tradingName,
//       registeredNumber: registeredNumber,
//       registeredAddress: registeredAddress,
//       primaryPersonContact: primaryPersonContact,
//     },
//   });
//   return createMerchantProfile;
// };
// const completeWareHouseProfile = async (req: Request) => {
//   const data = req.body.data;
//   const file = req.file;
//   const userId = req.user.id;
//   if (!data) {
//     throw new ApiError(httpStatus.NOT_FOUND, "data not found");
//   }
//   if (!file) {
//     throw new ApiError(httpStatus.NOT_FOUND, "file is required");
//   }
//   if (!userId) {
//     throw new ApiError(httpStatus.NOT_FOUND, "userId is required");
//   }
//   const isExistUser = await prisma.user.findFirst({ where: { id: userId } });
//   if (!isExistUser) {
//     throw new ApiError(httpStatus.NOT_FOUND, "User not found");
//   }
//   const image = (await fileUploader.uploadToDigitalOcean(file)).Location;
//   const parseData = JSON.parse(data);
//   const { fullName, postalCode, location } = parseData;
//   const updateUser = await prisma.user.update({
//     where: { id: userId },
//     data: {
//       profileImage: image,
//       fullName: fullName,
//       postalCode: postalCode,
//       location: location,
//       isCompleted: true,
//     },

//     select: {
//       id: true,
//       email: true,
//       fullName: true,
//       phoneNumber: true,
//       profileImage: true,
//       location: true,
//       postalCode: true,
//       isCompleted: true,
//       role: true,
//       createdAt: true,
//       updatedAt: true,
//     },
//   });
//   return updateUser
// };

const completeMerchantProfile = async (req: Request) => {
  const data = req.body.data;
  const file = req.file;
  const userId = req.user.id;

  if (!userId) {
    throw new ApiError(httpStatus.NOT_FOUND, "User ID not found");
  }

  const isExistUser = await prisma.user.findFirst({ where: { id: userId } });
  if (!isExistUser) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }

  let parsedData = {};
  if (data) {
    try {
      parsedData = JSON.parse(data);
    } catch (err) {
      throw new ApiError(httpStatus.BAD_REQUEST, "Invalid profile data format");
    }
  }

  const {
    companyName,
    tradingName,
    registeredNumber,
    registeredAddress,
    primaryPersonContact,
    location,
    postalCode,
  } = parsedData as any;

  let imageUrl;
  if (file) {
    const uploaded = await fileUploader.uploadToLocal(file);
    imageUrl = uploaded.Location;
  }

  // 🧠 Update user (dynamic fields only)
  await prisma.user.update({
    where: { id: userId },
    data: {
      ...(companyName && { fullName: companyName }),
      ...(postalCode && { postalCode }),
      ...(location && { location }),
      ...(imageUrl && { profileImage: imageUrl }),
      isCompleted: true,
    },
  });

  const isMerchantExist = await prisma.merchant.findFirst({
    where: { userId },
  });

  if (isMerchantExist) {
    // Update merchant profile
    return await prisma.merchant.update({
      where: { id: isMerchantExist.id },
      data: {
        ...(tradingName && { tradingName }),
        ...(registeredNumber && { registeredNumber }),
        ...(registeredAddress && { registeredAddress }),
        ...(primaryPersonContact && { primaryPersonContact }),
      },
    });
  } else {
    // Create merchant profile
    return await prisma.merchant.create({
      data: {
        userId,
        tradingName,
        registeredNumber,
        registeredAddress,
        primaryPersonContact,
      },
    });
  }
};

const completeWareHouseProfile = async (req: Request) => {
  const data = req.body.data;
  const file = req.file;
  const userId = req.user.id;

  if (!userId) {
    throw new ApiError(httpStatus.NOT_FOUND, "User ID is required");
  }

  const isExistUser = await prisma.user.findFirst({ where: { id: userId } });
  if (!isExistUser) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }

  let parsedData = {};
  if (data) {
    try {
      parsedData = JSON.parse(data);
    } catch (err) {
      throw new ApiError(httpStatus.BAD_REQUEST, "Invalid JSON format in data");
    }
  }

  const { fullName, postalCode, location } = parsedData as any;

  let imageUrl;
  if (file) {
    const uploaded = await fileUploader.uploadToLocal(file);
    imageUrl = uploaded.Location;
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(fullName && { fullName }),
      ...(postalCode && { postalCode }),
      ...(location && { location }),
      ...(imageUrl && { profileImage: imageUrl }),
      isCompleted: true,
    },
    select: {
      id: true,
      email: true,
      fullName: true,
      phoneNumber: true,
      profileImage: true,
      location: true,
      postalCode: true,
      isCompleted: true,
      role: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return updatedUser;
};

const approvedUser = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }
  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: { isApproved: user.isApproved ? false : true },
    select: {
      id: true,
      email: true,
      fullName: true,
      profileImage: true,
      isApproved: true,
      role: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  return updatedUser;
};

const findMyParcel = async (userId: string) => {
  const parcels = await prisma.parcel.findMany({
    where: { userId },
  });
  return parcels;
};

const deleteUserAndRelations = async (userId: string) => {
  // 1) Ensure the user exists
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }

  // 2) Run everything in a single transaction
  return prisma.$transaction(async (tx) => {
    // Gather IDs we’ll need for cascading deletes
    const parcels = await tx.parcel.findMany({
      where: { userId },
      select: { id: true },
    });
    const parcelIds = parcels.map((p) => p.id);

    const rooms = await tx.room.findMany({
      where: { OR: [{ senderId: userId }, { receiverId: userId }] },
      select: { id: true },
    });
    const roomIds = rooms.map((r) => r.id);

    const cardInfos = await tx.cardInfo.findMany({
      where: { userId },
      select: { id: true },
    });
    const bankInfos = await tx.bankInfo.findMany({
      where: { userId },
      select: { id: true },
    });
    const cardIds = cardInfos.map((c) => c.id);
    const bankIds = bankInfos.map((b) => b.id);

    // 3) Chats & Rooms
    await tx.chat.deleteMany({
      where: {
        OR: [
          { senderId: userId },
          { receiverId: userId },
          { roomId: { in: roomIds } },
        ],
      },
    });
    await tx.room.deleteMany({ where: { id: { in: roomIds } } });

    // 4) Parcel-linked data (do not rely on Prisma cascades in Mongo)
    if (parcelIds.length) {
      await tx.recipient.deleteMany({
        where: { deliveryInfoId: { in: parcelIds } },
      });
      await tx.paymentInfo.deleteMany({
        where: { OR: [{ orderId: { in: parcelIds } }, { userId }] },
      });
      await tx.parcelTrack.deleteMany({
        where: { orderId: { in: parcelIds } },
      });
      await tx.riderRequest.deleteMany({
        where: {
          OR: [
            { parcelId: { in: parcelIds } },
            { riderId: userId },
            { assignId: userId },
          ],
        },
      });
      await tx.whereHouseRequest.deleteMany({
        where: {
          OR: [{ parcelId: { in: parcelIds } }, { whereHouseId: userId }],
        },
      });
      await tx.provOfDelivery.deleteMany({
        where: { parcelId: { in: parcelIds } },
      });
      await tx.userParcel.deleteMany({
        where: { OR: [{ parcelId: { in: parcelIds } }, { userId }] },
      });
      await tx.parcel.deleteMany({ where: { id: { in: parcelIds } } });
    } else {
      // Still remove rider/warehouse requests that reference the user without a user-owned parcel
      await tx.riderRequest.deleteMany({
        where: { OR: [{ riderId: userId }, { assignId: userId }] },
      });
      await tx.whereHouseRequest.deleteMany({
        where: { whereHouseId: userId },
      });
      await tx.userParcel.deleteMany({ where: { userId } });
      await tx.paymentInfo.deleteMany({ where: { userId } });
    }

    // 5) Money-related models
    await tx.paymentRequest.deleteMany({
      where: {
        OR: [
          { userId },
          { cardId: { in: cardIds } },
          { bankId: { in: bankIds } },
        ],
      },
    });
    await tx.cardInfo.deleteMany({ where: { userId } });
    await tx.bankInfo.deleteMany({ where: { userId } });

    // 6) Driver/Merchant profiles
    await tx.driverProfile.deleteMany({ where: { userId } });
    await tx.merchant.deleteMany({ where: { userId } });

    // 7) Finally, the user
    await tx.user.delete({ where: { id: userId } });

    return { ok: true, deletedUserId: userId };
  });
};

const removeProfileImage = async (userId: string) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }
  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: { profileImage: "" },
    select: {
      id: true,
      email: true,
      fullName: true,
      profileImage: true,
    },
  });
  return updatedUser;
};

export const userService = {
  createUserIntoDb,
  getUsersFromDb,
  updateProfile,
  updateUserIntoDb,
  completeUserProfile,
  calculatePrice,
  contactMail,
  completeDriverProfile,
  completeMerchantProfile,
  completeWareHouseProfile,
  getSingleUserFromDb,
  approvedUser,

  deleteUserAndRelations,
  removeProfileImage,
};

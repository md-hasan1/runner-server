import multer from "multer";
import { v4 as uuidv4 } from "uuid";
import {
  S3Client,
  PutObjectCommand,
  ObjectCannedACL,
} from "@aws-sdk/client-s3";
import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import streamifier from "streamifier";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
dotenv.config();

// Configure DigitalOcean Spaces
const s3Client = new S3Client({
  region: "us-east-1",
  endpoint: process.env.DO_SPACE_ENDPOINT,
  credentials: {
    accessKeyId: process.env.DO_SPACE_ACCESS_KEY || "",
    secretAccessKey: process.env.DO_SPACE_SECRET_KEY || "",
  },
});

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Multer configuration using memoryStorage (for DigitalOcean & Cloudinary)
const storage = multer.memoryStorage();
const upload = multer({ storage });

// ✅ Fixed Cloudinary Storage
const cloudinaryStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    public_id: (req, file) => `${Date.now()}_${file.originalname}`,
  },
});

const cloudinaryUpload = multer({ storage: cloudinaryStorage });

// Upload single image
const uploadSingle = upload.single("image");
const uploadFile = upload.single("file");

// Upload multiple images
const uploadMultipleImage = upload.fields([{ name: "images", maxCount: 15 }]);

// Upload profile and banner images
const updateProfile = upload.fields([
  { name: "profile", maxCount: 1 },
  { name: "banner", maxCount: 1 },
]);
const addProf = upload.fields([
  { name: "proveImage", maxCount: 2 },
  { name: "signature", maxCount: 2 },
]);
const completeDriverProfile = upload.fields([
  { name: "profileImage", maxCount: 1 },
  { name: "personalIdentification", maxCount: 1 },
  { name: "proofOfAddress", maxCount: 1 },
  { name: "ukDrivingLicenseFront", maxCount: 1 },
  { name: "ukDrivingLicenseBack", maxCount: 1 },
  { name: "insuranceCertificate", maxCount: 1 },
  { name: "motCertificate", maxCount: 1 },
  { name: "nationalInsuranceDocument", maxCount: 1 },
  { name: "shearCode", maxCount: 1 },
  { name: "dbsCertificate", maxCount: 1 },
  { name: "vehiclePhotoFront", maxCount: 1 },
  { name: "vehiclePhotoBack", maxCount: 1 },
  { name: "vehiclePhotoRight", maxCount: 1 },
  { name: "vehiclePhotoLeft", maxCount: 1 },
  { name: "vehicleCargoArea", maxCount: 1 },
  { name: "speedometerMileage", maxCount: 1 },
]);

// ✅ Fixed Cloudinary Upload (Now supports buffer)
const uploadToCloudinary = async (
  file: Express.Multer.File
): Promise<{ Location: string; public_id: string }> => {
  if (!file) {
    throw new Error("File is required for uploading.");
  }

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "uploads",
        resource_type: "auto", // Supports images, videos, etc.
        use_filename: true,
        unique_filename: false,
      },
      (error, result) => {
        if (error) {
          console.error("Error uploading file to Cloudinary:", error);
          return reject(error);
        }

        // ✅ Explicitly return `Location` and `public_id`
        resolve({
          Location: result?.secure_url || "", // Cloudinary URL
          public_id: result?.public_id || "",
        });
      }
    );

    // Convert buffer to stream and upload
    streamifier.createReadStream(file.buffer).pipe(uploadStream);
  });
};

// ✅ Unchanged: DigitalOcean Upload
const uploadToDigitalOcean = async (file: Express.Multer.File) => {
  if (!file) {
    throw new Error("File is required for uploading.");
  }

  try {
    const Key = `nathancloud/${Date.now()}_${uuidv4()}_${file.originalname}`;
    const uploadParams = {
      Bucket: process.env.DO_SPACE_BUCKET || "",
      Key,
      Body: file.buffer, // ✅ Use buffer instead of file path
      ACL: "public-read" as ObjectCannedACL,
      ContentType: file.mimetype,
    };

    // Upload file to DigitalOcean Spaces
    await s3Client.send(new PutObjectCommand(uploadParams));

    // Format the URL
    const fileURL = `${process.env.DO_SPACE_ENDPOINT}/${process.env.DO_SPACE_BUCKET}/${Key}`;
    return {
      Location: fileURL,
      Bucket: process.env.DO_SPACE_BUCKET || "",
      Key,
    };
  } catch (error) {
    console.error("Error uploading file to DigitalOcean:", error);
    throw error;
  }
};

// Create uploads directory if it doesn't exist
// Use UPLOADS_DIR env var when provided so we can point to a persistent
// directory on VPS or a mounted volume. Falls back to the repo `uploads`.
const uploadDir = path.resolve(
  process.env.UPLOADS_DIR || path.join(__dirname, "..", "..", "uploads")
);
const checkAndCreateUploadDir = () => {
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
    console.log("Upload directory created.");
  }
};

const uploadToLocal = async (file: Express.Multer.File) => {
  console.log(file);
  if (!file) {
    throw new Error("File is required for uploading.");
  }

  // Ensure the upload directory exists
  checkAndCreateUploadDir();

  // Create a unique filename to avoid collisions
  const safeOriginal = file.originalname.replace(/\s+/g, "_");
  const uniqueFileName = `${Date.now()}_${uuidv4()}_${safeOriginal}`;

  // Destination path on local disk
  const destPath = path.join(uploadDir, uniqueFileName);

  try {
    // Write buffer to disk (memoryStorage provides `file.buffer`)
    if (!file.buffer) {
      throw new Error("File buffer is missing. Make sure you're using multer memoryStorage.");
    }
  // Ensure we write a proper Uint8Array to satisfy TS types
  await fs.promises.writeFile(destPath, file.buffer as unknown as Uint8Array);
  } catch (error) {
    console.error("Error saving file locally:", error);
    throw error;
  }

  // Generate local URL assuming Express serves static `/uploads`
  const base = (process.env.BACK_END_URL || "").replace(/\/$/, "");
  const fileURL = `${base}/uploads/${uniqueFileName}`;
  return {
    Location: fileURL,
    fileName: uniqueFileName,
    mimeType: file.mimetype,
    path: destPath,
  };
};

// ✅ No Name Changes, Just Fixes
export const fileUploader = {
  upload,
  uploadSingle,
  uploadMultipleImage,
  updateProfile,
  uploadFile,
  completeDriverProfile,
  cloudinaryUpload,
  uploadToLocal,
  uploadToDigitalOcean,
  addProf,
  uploadToCloudinary,
};

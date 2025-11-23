import express, { Application, NextFunction, Request, Response } from "express";

import httpStatus from "http-status";
import cors from "cors";
import cookieParser from "cookie-parser";
import GlobalErrorHandler from "./app/middlewares/globalErrorHandler";
import router from "./app/routes";
import path from "path";


const app: Application = express();
export const corsOptions = {
  origin: ["http://localhost:3001", "http://localhost:3000","https://www.runcourier.co.uk","https://runcourier.co.uk"],
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE","OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "Accept",
    "X-Requested-With",
    "Origin",
    "Cache-Control",
    "X-CSRF-Token",
    "User-Agent",
    "Content-Length",
  ],

  credentials: true,
};

// Middleware setup
app.use(cors(corsOptions));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));
// Serve uploads from a configurable directory so we can point to a persistent
// mount on VPS. Set UPLOADS_DIR in the environment to a path outside the
// project folder (for example: /var/www/almashriqi/uploads).
const uploadsPath = path.resolve(process.env.UPLOADS_DIR || path.join(__dirname, "../uploads"));
app.use("/uploads", express.static(uploadsPath));
// Route handler for root endpoint
app.get("/", (req: Request, res: Response) => {
  res.send({
    success:true,
    statusCode: httpStatus.OK,
    message: "The server is running!",
  });
});

// Router setup
app.use("/api/v1", router);


// Error handling middleware
app.use(GlobalErrorHandler);

// Not found handler
app.use((req: Request, res: Response, next: NextFunction) => {
  res.status(httpStatus.NOT_FOUND).json({
    success: false,
    message: "API NOT FOUND!",
    error: {
      path: req.originalUrl,
      message: "Your requested path is not found!",
    },
  });
});

export default app;

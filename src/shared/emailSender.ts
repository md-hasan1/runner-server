import nodemailer from "nodemailer";
import config from "../config";
// admin
const emailSender = async (email: string, html: string, subject: string) => {

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: "runcourier1@gmail.com",
      pass: "iusb zgqj xlsu qwiy",
    },
  });
  

  const info = await transporter.sendMail({
    from: "<Sales@runcourier.co.uk>",
    to: "<Sales@runcourier.co.uk>",
    subject: subject,
    html,
  });

// console.log(info);
};

export default emailSender;
// iusb zgqj xlsu qwiy
// runcourier1@gmail.com
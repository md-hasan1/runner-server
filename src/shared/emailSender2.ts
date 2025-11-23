import nodemailer from "nodemailer";

// user

const emailSender2 = async (email: string, html: string, subject: string) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: "runcourier1@gmail.com",
      pass: "iusb zgqj xlsu qwiy",
    },
  });
  const info = await transporter.sendMail({
    from: "sales@runcourier.co.uk",
    to: email,
    subject: subject,
    html,
  });

  // const info = await transporter.sendMail({
  //   from: "Sales@runcourier.co.uk",
  //   to: email,
  //   subject: subject,
  //   html,
  // });
};

export default emailSender2;

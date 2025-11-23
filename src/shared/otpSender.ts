import nodemailer from "nodemailer";
// admin
const otpEmailSender = async (email: string, html: string, subject: string) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: "Almashriqi2010@gmail.com",
      pass: "tbig zsqh wqjk iqsk",
    },
  });

  const info = await transporter.sendMail({
    from: "<Sales@runcourier.co.uk>",
    to: email,
    subject: subject,
    html,
  });

  console.log(info);
};

export default otpEmailSender;

import nodemailer from "nodemailer";
// Send email with attached PDF
export const invoiceSender = async (pdf: Buffer, subject: string) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER, // store in .env
      pass: process.env.EMAIL_PASS, // app-specific password
    },
  });

  const info = await transporter.sendMail({
    from: `"Invoice Bot" <Sales@runcourier.co.uk>`,
    to: "Almashriqi2010@gmail.com", // send to admin
    subject: subject,
    text: "Attached is your weekly Pay Later invoice.",
    attachments: [
      {
        filename: "invoice.pdf",
        content: pdf,
        contentType: "application/pdf",
      },
    ],
  });

  console.log("✅ Invoice email sent:", info.messageId);
  return info;
};

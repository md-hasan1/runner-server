import nodemailer from "nodemailer";


// user 

const emailSender3 = async (email: string, html: string, subject: string) => {

  // const transporter = nodemailer.createTransport({
  //   host: "smtp-relay.brevo.com",
  //   port: 587,
  //   secure: false,
  //   auth: {
  //     user: "8d12a9001@smtp-brevo.com", 
  //     pass: "RfJ79AzwEnt8pvcD", 
  //   },
  // });
  

  const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "runcourier1@gmail.com",
    pass: "iusb zgqj xlsu qwiy",
  },
});
  const info = await transporter.sendMail({
    from: email,
    to: "info@runcourier.co.uk",
    subject: subject,
    html,
  });

  
};

export default emailSender3;

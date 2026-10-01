import * as nodemailer from 'nodemailer';

export interface SendEmailOptions {
  email: string;
  subject: string;
  message: string;
}

export const sendEmail = async (options: SendEmailOptions): Promise<void> => {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const mailOptions: nodemailer.SendMailOptions = {
    from: `"BALATA" <${process.env.EMAIL_USER}>`,
    to: options.email.trim(),
    subject: options.subject,
    text: options.message,
  };

  await transporter.sendMail(mailOptions);
};

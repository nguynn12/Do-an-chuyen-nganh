import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST || "smtp.gmail.com",

  port: Number(
    process.env.MAIL_PORT || 465
  ),

  secure:
    String(
      process.env.MAIL_SECURE || "true"
    ).toLowerCase() === "true",

  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASSWORD,
  },
});


export async function verifyMailer() {
  try {
    await transporter.verify();

    console.log(
      "✅ Kết nối Email SMTP thành công!"
    );

    return true;

  } catch (error) {

    console.error(
      "❌ Không thể kết nối Email SMTP:",
      error.message
    );

    return false;
  }
}


export default transporter;
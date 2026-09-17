import nodemailer from "nodemailer";


// ============================================================
// MAIL TRANSPORTER
// ============================================================

const transporter = nodemailer.createTransport({
  service: "gmail",

  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_APP_PASSWORD,
  },
});


// ============================================================
// KIỂM TRA KẾT NỐI SMTP
// ============================================================

export async function verifyEmailConnection() {
  try {
    await transporter.verify();

    console.log(
      "Email SMTP đã kết nối thành công."
    );

    return true;
  } catch (error) {
    console.error(
      "Không thể kết nối Email SMTP:",
      error.message
    );

    return false;
  }
}


// ============================================================
// GỬI EMAIL
// ============================================================

export async function sendNotificationEmail({
  to,
  title,
  message,
}) {
  if (!to) {
    throw new Error(
      "Không có địa chỉ email người nhận."
    );
  }

  const info =
    await transporter.sendMail({
      from: {
        name: "DLU LMS Dashboard",
        address:
          process.env.EMAIL_USER,
      },

      to,

      subject:
        `[DLU LMS] ${title}`,

      text: message,

      html: `
        <div
          style="
            font-family: Arial, sans-serif;
            max-width: 600px;
            margin: 0 auto;
            color: #263c34;
          "
        >
          <div
            style="
              background: #176b4d;
              color: white;
              padding: 18px 22px;
              border-radius: 10px 10px 0 0;
            "
          >
            <strong>
              HỆ THỐNG HỌC TẬP TRỰC TUYẾN DLU
            </strong>
          </div>

          <div
            style="
              padding: 24px;
              border: 1px solid #e1e8e4;
              border-top: 0;
              border-radius: 0 0 10px 10px;
            "
          >
            <h2
              style="
                margin-top: 0;
                color: #176b4d;
              "
            >
              ${title}
            </h2>

            <p
              style="
                font-size: 15px;
                line-height: 1.7;
              "
            >
              ${message}
            </p>

            <hr
              style="
                border: 0;
                border-top: 1px solid #e8ecea;
                margin: 24px 0;
              "
            />

            <p
              style="
                margin: 0;
                color: #7b8883;
                font-size: 12px;
              "
            >
              Email được gửi tự động từ
              DLU LMS Dashboard.
            </p>
          </div>
        </div>
      `,
    });

  console.log(
    `Đã gửi email tới ${to}:`,
    info.messageId
  );

  return info;
}
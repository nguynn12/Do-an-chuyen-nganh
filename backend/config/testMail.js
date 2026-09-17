import "dotenv/config";
import transporter from "./mailer.js";


// ======================================================
// TEST EMAIL
// ======================================================

async function testMail() {
  try {
    console.log("⏳ Đang kiểm tra SMTP...");

    await transporter.verify();

    console.log("✅ SMTP kết nối thành công!");


    const info =
      await transporter.sendMail({
        from: {
          name:
            process.env.MAIL_FROM_NAME ||
            "LMS DLU",

          address:
            process.env.MAIL_USER,
        },

        // TEST: gửi cho chính email người gửi trước
        to: process.env.MAIL_USER,

        subject:
          "Test thông báo LMS DLU",

        text:
          "Đây là email test từ hệ thống LMS DLU.",

        html: `
          <div
            style="
              font-family: Arial, sans-serif;
              max-width: 600px;
              margin: auto;
              padding: 24px;
            "
          >
            <h2>
              🔔 LMS DLU
            </h2>

            <p>
              Xin chào,
            </p>

            <p>
              Đây là email test từ hệ thống
              thông báo LMS DLU.
            </p>

            <p>
              Nếu bạn nhận được email này thì
              chức năng gửi email đã hoạt động.
            </p>

            <hr />

            <small>
              Email được gửi tự động từ hệ thống LMS.
            </small>
          </div>
        `,
      });


    console.log(
      "📧 Gửi email thành công!"
    );

    console.log(
      "Message ID:",
      info.messageId
    );

  } catch (error) {

    console.error(
      "❌ Gửi email thất bại:"
    );

    console.error(
      error.message
    );

  } finally {

    transporter.close();

  }
}


testMail();
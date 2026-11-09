import bcrypt from "bcryptjs";
import pool from "../../config/database.js";
import { generateAuthToken } from "../services/tokenService.js";

export async function login(req, res) {
  try {
    const { username, password } = req.body;

    if (!username?.trim() || !password) {
      return res.status(400).json({
        success: false,
        message:
          "Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu.",
      });
    }

    const [rows] = await pool.query(
      `
      SELECT
        a.Account_ID,
        a.Username,
        a.Password_Hash,
        a.Role,
        a.Is_Active AS Account_Is_Active,

        u.User_Key,
        u.Moodle_User_ID,
        u.Full_Name,
        u.Email,
        u.Primary_Role,
        u.Is_Active AS User_Is_Active

      FROM App_User_Account a

      INNER JOIN Dim_User u
        ON u.User_Key = a.User_Key

      WHERE LOWER(a.Username) = LOWER(?)

      LIMIT 1
      `,
      [username.trim()]
    );

    if (rows.length === 0) {
      return res.status(401).json({
        success: false,
        message:
          "Tên đăng nhập hoặc mật khẩu không đúng.",
      });
    }

    const account = rows[0];

    if (
      !account.Account_Is_Active ||
      !account.User_Is_Active
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Tài khoản hiện đang bị khóa.",
      });
    }

    const passwordMatched =
      await bcrypt.compare(
        password,
        account.Password_Hash
      );

    if (!passwordMatched) {
      return res.status(401).json({
        success: false,
        message:
          "Tên đăng nhập hoặc mật khẩu không đúng.",
      });
    }

    const token = generateAuthToken({
      userKey: account.User_Key,
      moodleUserId: account.Moodle_User_ID,
      username: account.Username,
      role: account.Role,
    });

    return res.json({
      success: true,
      message: "Đăng nhập thành công.",
      token,
      user: {
        userKey: account.User_Key,
        moodleUserId:
          account.Moodle_User_ID,
        username:
          account.Username,
        fullName:
          account.Full_Name,
        email:
          account.Email,
        role:
          account.Role,
        primaryRole:
          account.Primary_Role,
      },
    });
  } catch (error) {
    console.error("Lỗi login:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể đăng nhập.",
      error: error.message,
    });
  }
}

// ============================================================
// HELPER: DECODE JWT PAYLOAD
// ============================================================
function decodeJwtPayload(token) {
  try {
    if (!token || typeof token !== "string") return null;
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = Buffer.from(base64, "base64").toString("utf8");
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

// ============================================================
// ĐĂNG NHẬP BẰNG MICROSOFT ENTRA ID (SSO THỰC TẾ)
// ============================================================
export async function loginWithMicrosoft(req, res) {
  try {
    const { accessToken, idToken } = req.body;

    if (!accessToken && !idToken) {
      return res.status(400).json({
        success: false,
        message: "Thiếu thông tin xác thực Microsoft (Access Token hoặc ID Token).",
      });
    }

    let verifiedEmail = "";
    let displayName = "";

    // 1. Kiểm chứng qua Microsoft Graph API nếu có Access Token
    if (accessToken) {
      try {
        const graphRes = await fetch("https://graph.microsoft.com/v1.0/me", {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (graphRes.ok) {
          const profile = await graphRes.json();
          verifiedEmail = (profile.mail || profile.userPrincipalName || "").toLowerCase().trim();
          displayName = profile.displayName || "";
        }
      } catch (graphErr) {
        console.warn("[Microsoft Auth] Không thể gọi Graph API:", graphErr.message);
      }
    }

    // 2. Fallback kiểm tra ID Token
    if (!verifiedEmail && idToken) {
      const claims = decodeJwtPayload(idToken);
      if (claims) {
        // Kiểm tra thời hạn
        if (claims.exp && Number(claims.exp) * 1000 < Date.now()) {
          return res.status(401).json({
            success: false,
            message: "Mã định danh Microsoft đã hết hạn. Vui lòng thử lại.",
          });
        }

        // Kiểm tra issuer Microsoft
        const iss = claims.iss || "";
        if (!iss.includes("login.microsoftonline.com") && !iss.includes("sts.windows.net")) {
          return res.status(401).json({
            success: false,
            message: "Issuer Microsoft không hợp lệ.",
          });
        }

        verifiedEmail = (claims.email || claims.preferred_username || claims.upn || "").toLowerCase().trim();
        displayName = claims.name || "";
      }
    }

    if (!verifiedEmail) {
      return res.status(400).json({
        success: false,
        message: "Không thể xác minh danh tính tài khoản Microsoft.",
      });
    }

    // 3. Tra cứu người dùng trong CSDL LMS qua Email
    const [rows] = await pool.query(
      `
      SELECT
        a.Account_ID,
        a.Username,
        a.Role,
        a.Is_Active AS Account_Is_Active,

        u.User_Key,
        u.Moodle_User_ID,
        u.Full_Name,
        u.Email,
        u.Primary_Role,
        u.Is_Active AS User_Is_Active

      FROM App_User_Account a

      INNER JOIN Dim_User u
        ON u.User_Key = a.User_Key

      WHERE LOWER(u.Email) = LOWER(?)

      LIMIT 1
      `,
      [verifiedEmail]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Tài khoản Microsoft (${verifiedEmail}) chưa được liên kết với bất kỳ tài khoản LMS nào trong hệ thống. Vui lòng liên hệ Quản trị viên để đăng ký.`,
      });
    }

    const account = rows[0];

    if (!account.Account_Is_Active || !account.User_Is_Active) {
      return res.status(403).json({
        success: false,
        message: "Tài khoản LMS liên kết hiện đang bị khóa.",
      });
    }

    const token = generateAuthToken({
      userKey: account.User_Key,
      moodleUserId: account.Moodle_User_ID,
      username: account.Username,
      role: account.Role,
    });

    return res.json({
      success: true,
      message: "Đăng nhập Microsoft thành công.",
      token,
      user: {
        userKey: account.User_Key,
        moodleUserId: account.Moodle_User_ID,
        username: account.Username,
        fullName: account.Full_Name || displayName,
        email: account.Email,
        role: account.Role,
        primaryRole: account.Primary_Role,
      },
    });
  } catch (error) {
    console.error("Lỗi đăng nhập Microsoft:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi hệ thống khi xác thực tài khoản Microsoft.",
      error: error.message,
    });
  }
}

// ============================================================
// ĐĂNG NHẬP BẰNG GOOGLE IDENTITY (OIDC THỰC TẾ)
// ============================================================
export async function loginWithGoogle(req, res) {
  try {
    const { credential, accessToken } = req.body;

    if (!credential && !accessToken) {
      return res.status(400).json({
        success: false,
        message: "Thiếu mã xác thực Google (ID Token hoặc Access Token).",
      });
    }

    let verifiedEmail = "";
    let displayName = "";

    // 1. Kiểm chứng ID Token với Google TokenInfo API chính thức
    if (credential) {
      const verifyUrl = `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`;
      const googleRes = await fetch(verifyUrl);

      if (!googleRes.ok) {
        return res.status(401).json({
          success: false,
          message: "Mã xác thực Google không hợp lệ hoặc đã hết hạn.",
        });
      }

      const tokenData = await googleRes.json();

      // Kiểm tra email_verified
      if (tokenData.email_verified !== "true" && tokenData.email_verified !== true) {
        return res.status(401).json({
          success: false,
          message: "Email Google chưa được xác minh bởi Google.",
        });
      }

      // Kiểm tra audience nếu backend có cấu hình GOOGLE_CLIENT_ID
      const expectedClientId = process.env.GOOGLE_CLIENT_ID;
      if (expectedClientId && tokenData.aud !== expectedClientId) {
        return res.status(401).json({
          success: false,
          message: "Google Client ID (aud) không khớp với cấu hình hệ thống.",
        });
      }

      verifiedEmail = (tokenData.email || "").toLowerCase().trim();
      displayName = tokenData.name || "";
    } else if (accessToken) {
      // 2. Xác thực bằng Google UserInfo qua Access Token
      const userinfoRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!userinfoRes.ok) {
        return res.status(401).json({
          success: false,
          message: "Google Access Token không hợp lệ.",
        });
      }

      const userInfo = await userinfoRes.json();
      verifiedEmail = (userInfo.email || "").toLowerCase().trim();
      displayName = userInfo.name || "";
    }

    if (!verifiedEmail) {
      return res.status(400).json({
        success: false,
        message: "Không thể lấy thông tin email từ Google.",
      });
    }

    // 3. Tra cứu người dùng trong CSDL LMS qua Email
    const [rows] = await pool.query(
      `
      SELECT
        a.Account_ID,
        a.Username,
        a.Role,
        a.Is_Active AS Account_Is_Active,

        u.User_Key,
        u.Moodle_User_ID,
        u.Full_Name,
        u.Email,
        u.Primary_Role,
        u.Is_Active AS User_Is_Active

      FROM App_User_Account a

      INNER JOIN Dim_User u
        ON u.User_Key = a.User_Key

      WHERE LOWER(u.Email) = LOWER(?)

      LIMIT 1
      `,
      [verifiedEmail]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Tài khoản Google (${verifiedEmail}) chưa được liên kết với bất kỳ tài khoản LMS nào trong hệ thống. Vui lòng liên hệ Quản trị viên để đăng ký.`,
      });
    }

    const account = rows[0];

    if (!account.Account_Is_Active || !account.User_Is_Active) {
      return res.status(403).json({
        success: false,
        message: "Tài khoản LMS liên kết hiện đang bị khóa.",
      });
    }

    const token = generateAuthToken({
      userKey: account.User_Key,
      moodleUserId: account.Moodle_User_ID,
      username: account.Username,
      role: account.Role,
    });

    return res.json({
      success: true,
      message: "Đăng nhập Google thành công.",
      token,
      user: {
        userKey: account.User_Key,
        moodleUserId: account.Moodle_User_ID,
        username: account.Username,
        fullName: account.Full_Name || displayName,
        email: account.Email,
        role: account.Role,
        primaryRole: account.Primary_Role,
      },
    });
  } catch (error) {
    console.error("Lỗi đăng nhập Google:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi hệ thống khi xác thực tài khoản Google.",
      error: error.message,
    });
  }
}

// ============================================================
// LẤY DEMO SESSION TOKEN (CHO KIỂM THỬ VÀ DEMO CỤC BỘ)
// ============================================================
export async function getDemoSessionToken(req, res) {
  try {
    // BẢO MẬT P0: Mặc định vô hiệu hóa hoàn toàn endpoint này trên mọi cấu hình thông thường và Production
    const isDev = process.env.NODE_ENV === "development";
    const isDemoEnabled = process.env.ENABLE_DEMO_TOKEN === "true";

    if (!isDev || !isDemoEnabled) {
      return res.status(403).json({
        success: false,
        message:
          "API cấp token demo đã bị vô hiệu hóa vì lý do bảo mật. Vui lòng đăng nhập qua hệ thống xác thực chuẩn (/api/auth/login hoặc SSO).",
      });
    }

    // Nếu cấu hình DEMO_SECRET_KEY, bắt buộc client phải gửi kèm header 'x-dev-demo-key'
    const requiredDemoKey = process.env.DEMO_SECRET_KEY;
    const providedDemoKey = req.headers["x-dev-demo-key"];

    if (requiredDemoKey && (!providedDemoKey || providedDemoKey !== requiredDemoKey)) {
      return res.status(403).json({
        success: false,
        message:
          "Từ chối truy cập: Khóa xác thực demo (x-dev-demo-key) không hợp lệ hoặc bị thiếu.",
      });
    }

    const { username = "gv_nguyenan" } = req.body;

    const [rows] = await pool.query(
      `
      SELECT
        a.Account_ID,
        a.Username,
        a.Role,
        a.Is_Active AS Account_Is_Active,
        u.User_Key,
        u.Moodle_User_ID,
        u.Full_Name,
        u.Email,
        u.Primary_Role,
        u.Is_Active AS User_Is_Active
      FROM App_User_Account a
      INNER JOIN Dim_User u
        ON u.User_Key = a.User_Key
      WHERE LOWER(a.Username) = LOWER(?)
      LIMIT 1
      `,
      [username.trim()]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Không tìm thấy tài khoản '${username}'.`,
      });
    }

    const account = rows[0];

    if (!account.Account_Is_Active || !account.User_Is_Active) {
      return res.status(403).json({
        success: false,
        message: "Tài khoản hiện đang bị khóa.",
      });
    }

    const token = generateAuthToken({
      userKey: account.User_Key,
      moodleUserId: account.Moodle_User_ID,
      username: account.Username,
      role: account.Role,
    });

    return res.json({
      success: true,
      message: "Lấy demo session token thành công.",
      token,
      user: {
        userKey: account.User_Key,
        moodleUserId: account.Moodle_User_ID,
        username: account.Username,
        fullName: account.Full_Name,
        email: account.Email,
        role: account.Role,
        primaryRole: account.Primary_Role,
      },
    });
  } catch (error) {
    console.error("Lỗi getDemoSessionToken:", error);
    return res.status(500).json({
      success: false,
      message: "Không thể lấy demo session token.",
      error: error.message,
    });
  }
}
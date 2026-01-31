package utils

import (
	"fmt"
	"net/smtp"
	"os"
)

func SendOTPEmail(toEmail string, otp string) error {

	from := os.Getenv("EMAIL_FROM")
	password := os.Getenv("EMAIL_PASSWORD")

	if from == "" || password == "" {
		return fmt.Errorf("email credentials not set")
	}

	smtpHost := "smtp.gmail.com"
	smtpPort := "587"

	subject := "DevLink • Verify your email"

	body := fmt.Sprintf(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
</head>
<body style="margin:0; padding:0; background:#0f172a; font-family:Arial, Helvetica, sans-serif;">
  <div style="max-width:520px; margin:40px auto; background:#111827; border-radius:16px; padding:28px; color:#ffffff;">
    
    <!-- Header -->
    <h2 style="text-align:center; margin:0;">
      Dev<span style="color:#3b82f6;">Link</span>
    </h2>

    <p style="text-align:center; color:#94a3b8; font-size:14px; margin-top:6px;">
      Email verification required
    </p>

    <!-- Content -->
    <div style="margin:32px 0; text-align:center;">
      <p style="font-size:14px; color:#cbd5f5; margin-bottom:16px;">
        Use the following One-Time Password (OTP) to verify your account:
      </p>

      <div style="
        display:inline-block;
        background:#020617;
        padding:16px 32px;
        border-radius:12px;
        font-size:28px;
        font-weight:bold;
        letter-spacing:6px;
        color:#3b82f6;
        margin-bottom:12px;
      ">
        %s
      </div>

      <p style="font-size:12px; color:#94a3b8;">
        This OTP is valid for <strong>10 minutes</strong>.
      </p>
    </div>

    <!-- Footer -->
    <hr style="border:none; border-top:1px solid #1e293b; margin:24px 0;" />

    <p style="font-size:12px; color:#64748b; text-align:center; line-height:1.6;">
      If you did not request this verification, you can safely ignore this email.
      <br />
      © DevLink
    </p>

  </div>
</body>
</html>
`, otp)

	message := []byte(
		"From: DevLink <" + from + ">\r\n" +
			"To: " + toEmail + "\r\n" +
			"Subject: " + subject + "\r\n" +
			"MIME-Version: 1.0\r\n" +
			"Content-Type: text/html; charset=\"UTF-8\"\r\n\r\n" +
			body,
	)

	auth := smtp.PlainAuth("", from, password, smtpHost)

	err := smtp.SendMail(
		smtpHost+":"+smtpPort,
		auth,
		from,
		[]string{toEmail},
		message,
	)

	return err
}

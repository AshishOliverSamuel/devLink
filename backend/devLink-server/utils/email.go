package utils

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
)

func SendOTPEmail(toEmail string, otp string) error {

	apiKey := os.Getenv("RESEND_API_KEY")
	from := os.Getenv("EMAIL_FROM")

	if apiKey == "" || from == "" {
		return fmt.Errorf("resend env variables not set")
	}

	payload := map[string]interface{}{
		"from": from,
		"to":   []string{toEmail},
		"subject": "DevLink • Verify your email",
		"html": fmt.Sprintf(`
<!DOCTYPE html>
<html>
<body style="background:#0f172a; font-family:Arial; padding:40px;">
  <div style="max-width:520px; margin:auto; background:#111827; padding:28px; border-radius:16px; color:#fff;">
    <h2 style="text-align:center;">
      Dev<span style="color:#3b82f6;">Link</span>
    </h2>

    <p style="text-align:center; color:#94a3b8;">
      Email verification required
    </p>

    <div style="margin:32px 0; text-align:center;">
      <p style="color:#cbd5f5;">Your One-Time Password:</p>

      <div style="
        font-size:28px;
        font-weight:bold;
        letter-spacing:6px;
        color:#3b82f6;
        background:#020617;
        padding:16px 32px;
        border-radius:12px;
        display:inline-block;
      ">
        %s
      </div>

      <p style="font-size:12px; color:#94a3b8; margin-top:12px;">
        Valid for 10 minutes
      </p>
    </div>

    <p style="font-size:12px; color:#64748b; text-align:center;">
      If you didn’t request this, ignore this email.
    </p>
  </div>
</body>
</html>
`, otp),
	}

	body, _ := json.Marshal(payload)

	req, err := http.NewRequest(
		"POST",
		"https://api.resend.com/emails",
		bytes.NewBuffer(body),
	)
	if err != nil {
		return err
	}

	req.Header.Set("Authorization", "Bearer "+apiKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 300 {
		return fmt.Errorf("resend failed with status %d", resp.StatusCode)
	}

	return nil
}

import aiosmtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from app.config import settings


async def send_workspace_invite_email(
    to_email: str,
    inviter_name: str,
    workspace_name: str,
    role: str,
    invite_token: str,
):
    """Send a workspace invitation email via Gmail SMTP."""
    accept_url = f"{settings.FRONTEND_URL}/invite/accept?token={invite_token}"

    role_descriptions = {
        "viewer": "Viewer (read-only access)",
        "member": "Member (can create and edit tasks)",
        "admin": "Admin (full workspace access)",
        "owner": "Owner",
    }
    role_label = role_descriptions.get(role, role.capitalize())

    html_body = f"""
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background:#0f172a;font-family:system-ui,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:520px;background:#1e293b;border-radius:16px;border:1px solid #334155;overflow:hidden;">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:32px;text-align:center;">
              <div style="display:inline-block;width:40px;height:40px;background:rgba(255,255,255,0.2);border-radius:12px;line-height:40px;text-align:center;font-weight:700;font-size:16px;color:#fff;">CS</div>
              <span style="font-size:22px;font-weight:700;color:#fff;vertical-align:middle;margin-left:8px;">CollabSphere</span>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 32px;">
              <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#f1f5f9;">You're invited! 🎉</h1>
              <p style="margin:0 0 24px;color:#94a3b8;font-size:15px;line-height:1.6;">
                <strong style="color:#e2e8f0;">{inviter_name}</strong> has invited you to join the
                <strong style="color:#e2e8f0;">"{workspace_name}"</strong> workspace on CollabSphere
                as a <strong style="color:#a5b4fc;">{role_label}</strong>.
              </p>

              <div style="text-align:center;margin:32px 0;">
                <a href="{accept_url}"
                   style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;text-decoration:none;font-weight:600;font-size:15px;padding:14px 36px;border-radius:12px;">
                  Accept Invitation
                </a>
              </div>

              <p style="margin:0 0 8px;color:#64748b;font-size:13px;text-align:center;">
                This invite link expires in <strong style="color:#94a3b8;">7 days</strong>.
              </p>
              <p style="margin:0;color:#475569;font-size:12px;text-align:center;word-break:break-all;">
                Or copy this link:<br/>
                <a href="{accept_url}" style="color:#818cf8;">{accept_url}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px;border-top:1px solid #334155;text-align:center;">
              <p style="margin:0;color:#475569;font-size:12px;">
                If you weren't expecting this invitation, you can safely ignore this email.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
"""

    text_body = (
        f"You're invited to CollabSphere!\n\n"
        f"{inviter_name} has invited you to join the \"{workspace_name}\" workspace "
        f"as a {role_label}.\n\n"
        f"Accept your invitation here:\n{accept_url}\n\n"
        f"This link expires in 7 days.\n\n"
        f"If you weren't expecting this, you can safely ignore this email."
    )

    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"{inviter_name} invited you to \"{workspace_name}\" on CollabSphere"
    msg["From"] = f"CollabSphere <{settings.GMAIL_USER}>"
    msg["To"] = to_email
    msg.attach(MIMEText(text_body, "plain"))
    msg.attach(MIMEText(html_body, "html"))

    await aiosmtplib.send(
        msg,
        hostname="smtp.gmail.com",
        port=465,
        username=settings.GMAIL_USER,
        password=settings.GMAIL_APP_PASSWORD,
        use_tls=True,
    )
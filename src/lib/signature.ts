// The nursery's email signature, as agreed in November 2026 (brand/email-signature.html
// in the project files). Tables and inline styles in Arial, because that is what
// Outlook, Gmail and Apple Mail all render the same way. The only image is the
// logo, loaded from the public website so it doesn't arrive as an attachment.
export const SIGNATURE_LOGO_URL = "https://montagu-square.co.uk/wp-content/uploads/2025/09/logo-montagu.png";

const C = { navy: "#4A699F", ink: "#2B2B2B", muted: "#5F6B7A", mint: "#B8E6CC" };
const TILES = ["#F790A2", "#B8E6CC", "#FCD08D", "#E3BFE3"];
const F = "font-family:Arial,Helvetica,sans-serif;";

const PHONE = "01480 475522";
const EMAIL = "office@montagu-square.co.uk";
const ADDRESS = "Montagu Square, Eynesbury, St. Neots PE19 2TL";
const MEMBERSHIPS = "Ofsted URN 221620 | NDNA member A54894 | EYA member 2119002";
const CONFIDENTIAL =
  "This email and any attachments are confidential and intended only for the recipient. If you have received this email in error, please notify us immediately and delete it.";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function roleLine(role: string) {
  return (role ? `${role}, ` : "") + "Montagu Square Day Nursery";
}

function line(label: string, text: string, href?: string) {
  const value = href ? `<a href="${href}" style="color:${C.ink};text-decoration:none;">${text}</a>` : text;
  return (
    `<tr><td style="${F}font-size:13px;line-height:20px;color:${C.navy};font-weight:bold;padding:0 10px 0 0;mso-line-height-rule:exactly;" valign="top">${label}</td>` +
    `<td style="${F}font-size:13px;line-height:20px;color:${C.ink};mso-line-height-rule:exactly;" valign="top">${value}</td></tr>`
  );
}

export function signatureHtml(name: string, role: string, logo = SIGNATURE_LOGO_URL) {
  const strip = TILES.map(
    (c) =>
      `<td width="25%" height="4" bgcolor="${c}" style="width:25%;height:4px;background-color:${c};font-size:1px;line-height:4px;mso-line-height-rule:exactly;">&nbsp;</td>`,
  ).join("");
  return (
    `<table cellpadding="0" cellspacing="0" border="0" role="presentation" width="480" style="width:100%;max-width:480px;border-collapse:collapse;${F}">` +
    `<tr>` +
    `<td width="132" valign="middle" style="width:132px;padding:0 18px 0 0;vertical-align:middle;">` +
    `<a href="https://www.montagu-square.co.uk" style="text-decoration:none;"><img src="${esc(logo)}" width="132" height="88" alt="Montagu Square Day Nursery" style="display:block;width:132px;height:88px;border:0;outline:none;"></a>` +
    `</td>` +
    `<td valign="middle" style="vertical-align:middle;padding:2px 0 2px 18px;border-left:2px solid ${C.mint};">` +
    `<table cellpadding="0" cellspacing="0" border="0" role="presentation" style="border-collapse:collapse;">` +
    `<tr><td colspan="2" style="${F}font-size:16px;line-height:22px;font-weight:bold;color:${C.navy};mso-line-height-rule:exactly;">${esc(name)}</td></tr>` +
    `<tr><td colspan="2" style="${F}font-size:13px;line-height:18px;color:${C.muted};padding:0 0 8px 0;mso-line-height-rule:exactly;">${esc(roleLine(role))}</td></tr>` +
    line("T", PHONE, "tel:+441480475522") +
    line("E", EMAIL, `mailto:${EMAIL}`) +
    line("W", "montagu-square.co.uk", "https://www.montagu-square.co.uk") +
    line("A", ADDRESS) +
    `</table>` +
    `</td>` +
    `</tr>` +
    `<tr><td colspan="2" style="padding:14px 0 0 0;"><table cellpadding="0" cellspacing="0" border="0" role="presentation" width="100%" style="width:100%;border-collapse:collapse;"><tr>${strip}</tr></table></td></tr>` +
    `<tr><td colspan="2" style="${F}font-size:11px;line-height:16px;color:${C.muted};padding:10px 0 0 0;mso-line-height-rule:exactly;">${MEMBERSHIPS.replace(/ \| /g, " &nbsp;&middot;&nbsp; ")}</td></tr>` +
    `<tr><td colspan="2" style="${F}font-size:10px;line-height:14px;color:${C.muted};padding:6px 0 0 0;mso-line-height-rule:exactly;">${CONFIDENTIAL}</td></tr>` +
    `</table>`
  );
}

export function signaturePlain(name: string, role: string) {
  return [
    name,
    roleLine(role),
    "",
    `T  ${PHONE}`,
    `E  ${EMAIL}`,
    "W  www.montagu-square.co.uk",
    `A  ${ADDRESS}`,
    "",
    MEMBERSHIPS,
    "",
    CONFIDENTIAL,
  ].join("\n");
}

export function signatureShort(name: string) {
  return `${name}\nMontagu Square Day Nursery\n${PHONE} | montagu-square.co.uk`;
}

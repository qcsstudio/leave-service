const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

exports.sendHolidayMail = async (email, holiday) => {

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "New Holiday Announcement",
    html: `
      <h2>New Holiday Added</h2>
      <p><b>${holiday.name}</b></p>
      <p>Date: ${new Date(holiday.date).toDateString()}</p>
      <p>${holiday.description || ""}</p>
    `
  };

  await transporter.sendMail(mailOptions);
};
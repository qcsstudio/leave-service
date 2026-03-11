const holidayQueue = require("../queues/holiday.queue");
const Notification = require("../notification/notification.model");
const employeeClient = require("../../clients/employee.client");
const { sendHolidayMail } = require("../../utils/mailer");

holidayQueue.process("sendHolidayNotification", async (job) => {

  const { companyId, holiday } = job.data;

  // get employees from employee-service
  const employees = await employeeClient.getEmployeesByCompany(companyId);

  for (const emp of employees) {

    await Notification.create({
      userId: emp._id,
      companyId,
      title: "Holiday Announcement",
      message: `${holiday.name} on ${new Date(holiday.date).toDateString()}`
    });

    await sendHolidayMail(emp.email, holiday);

  }

});
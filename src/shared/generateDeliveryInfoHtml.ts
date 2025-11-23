export const generateDeliveryInfoHtml = (
  info: any,
  amount: number,
  subject: string,
  isReturnTrip?: boolean,
  distance?: string,
): string => {
  const {
    id,
    pickupName,
    pickupMobile,
    pickupEmail,
    pickupPostCode,
    pickupAddress,
    preferredCollectionDate,
    avgCollectionTime,
    toavgCollectionTime,
    avgDeliveryTime,
    toAvgDeliveryTime,
    packageWeight,
    serviceType,
    packageContent,
    specialInstruction,
    recipients = [],
  } = info;

  const formattedDate = new Date(preferredCollectionDate).toLocaleDateString('en-GB', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const recipientsHtml = recipients
    .map(
      (recipient: any) => `
        <li style="margin-bottom: 15px;">
          <strong>${recipient.recipientName}</strong><br />
          Mobile: ${recipient.recipientMobile}<br />
          Email: ${recipient.recipientEmail}<br />
          Postal Code: ${recipient.recipientPostCode}<br />
          Address: ${recipient.recipientAddress}
        </li>
      `
    )
    .join('');

  const distanceHtml = distance
    ? `
      <h3 style="color: #4CAF50;">Distance</h3>
      <p><strong>${distance} miles</strong></p>
    `
    : '';

  const returnTripHtml = isReturnTrip
    ? (() => {
        if (!recipients || recipients.length < 2) {
          // Fallback if not enough recipients
          return `
            <h3 style="color: #4CAF50;">Return Trip - Pickup Details</h3>
            <p><strong>Name:</strong> ${pickupName}</p>
            <p><strong>Mobile:</strong> ${pickupMobile}</p>
            <p><strong>Email:</strong> ${pickupEmail}</p>
            <p><strong>Address:</strong> ${pickupAddress}</p>
            <p><strong>Post Code:</strong> ${pickupPostCode}</p>
            <p><strong>Collection Date:</strong> ${formattedDate}</p>
            <p><strong>Time Window:</strong> ${avgCollectionTime} - ${toavgCollectionTime}</p>
          `;
        }

        // last recipient = return pickup point
        const returnPickup = recipients[recipients.length - 1];

        // recipients before last = return trip recipients
        const returnRecipients = recipients.slice(0, recipients.length - 1);

        const returnRecipientsHtml = returnRecipients
          .map(
            (r: any) => `
              <li style="margin-bottom: 15px;">
                <strong>${r.recipientName}</strong><br />
                Mobile: ${r.recipientMobile}<br />
                Email: ${r.recipientEmail}<br />
                Postal Code: ${r.recipientPostCode}<br />
                Address: ${r.recipientAddress}
              </li>
            `
          )
          .join('');

        return `
          <h3 style="color: #4CAF50;">Return Trip - Pickup Details</h3>
          <p><strong>Name:</strong> ${returnPickup.recipientName}</p>
          <p><strong>Mobile:</strong> ${returnPickup.recipientMobile}</p>
          <p><strong>Email:</strong> ${returnPickup.recipientEmail}</p>
          <p><strong>Address:</strong> ${returnPickup.recipientAddress}</p>
          <p><strong>Post Code:</strong> ${returnPickup.recipientPostCode}</p>
          <p><strong>Collection Date:</strong> ${formattedDate}</p>
          <p><strong>Time Window:</strong> ${avgCollectionTime} - ${toavgCollectionTime}</p>

          <h4 style="color: #4CAF50;">Return Trip Recipients</h4>
          <ul style="padding-left: 20px;">
            ${returnRecipientsHtml}
          </ul>
        `;
      })()
    : '';

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>${subject}</title>
  </head>
  <body style="font-family: Arial, sans-serif; background-color: #f9f9f9; padding: 20px; color: #333;">
    <div style="max-width: 600px; margin: auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 0 10px rgba(0,0,0,0.1);">
      <div style="background-color: #4CAF50; color: white; padding: 20px;">
        <h2 style="margin: 0;">${subject || "Delivery Request Confirmed"}</h2>
      </div>

      <div style="padding: 20px;">
        <h3 style="color: #4CAF50;">Pickup Details</h3>
        <p><strong>orderId:</strong> ${id}</p>
        <p><strong>Name:</strong> ${pickupName}</p>
        <p><strong>Mobile:</strong> ${pickupMobile}</p>
        <p><strong>Email:</strong> ${pickupEmail}</p>
        <p><strong>Address:</strong> ${pickupAddress}</p>
        <p><strong>Post Code:</strong> ${pickupPostCode}</p>
        <p><strong>Collection Date:</strong> ${formattedDate}</p>
        <p><strong>Time Window:</strong> ${avgCollectionTime} - ${toavgCollectionTime}</p>

        ${returnTripHtml}

        <h3 style="color: #4CAF50;">Delivery Window</h3>
        <p><strong>Time Window:</strong> ${avgDeliveryTime} - ${toAvgDeliveryTime}</p>

        <h3 style="color: #4CAF50;">Package Information</h3>
        <p><strong>Weight:</strong> ${packageWeight} kg</p>
        <p><strong>Content:</strong> ${packageContent}</p>
        <p><strong>Service Type:</strong> ${serviceType}</p>
        <p><strong>Special Instruction:</strong> ${specialInstruction}</p>

        <h3 style="color: #4CAF50;">Recipients</h3>
        <ul style="padding-left: 20px;">
          ${recipientsHtml}
        </ul>

        <h3 style="color: #4CAF50;">Total Amount</h3>
        <p><strong>£${amount.toFixed(2)}</strong></p>

        ${distanceHtml}
      </div>

      <div style="background-color: #f1f1f1; padding: 15px; text-align: center; font-size: 12px; color: #777;">
        © ${new Date().getFullYear()} Your Company Name. All rights reserved.
      </div>
    </div>
  </body>
</html>`;
};

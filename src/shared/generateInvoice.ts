import PDFDocument from "pdfkit";
import { paymentStatus } from "@prisma/client";
import prisma from "./prisma";

export const generateInvoice = async (): Promise<Buffer | null> => {
  const payments = await prisma.paymentRequest.findMany({
    where: { status: paymentStatus.PAY_LATER },
    select: {
      id: true,
      status: true,
      type: true,
      amount: true,
      user: { select: { email: true, fullName: true, customerId: true } },
      card: { select: { bankName: true, bankHolderName: true, accountNumber: true } },
      bank: { select: { bankName: true, accountNumber: true, bankHolderName: true, sortCode: true } },
    },
  });

  if (payments.length === 0) {
    console.log("No PAY_LATER requests found");
    return null;
  }

  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: "A4" });
    const chunks: Buffer[] = [];
    const pageWidth = doc.page.width - 100; // 50 margin each side
    const rowHeight = 100; // Increased height for card style
    let y = 130;

    // Define the card width
    const cardWidth = pageWidth - 40;

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks as any)));
    doc.on("error", (err) => reject(err));

    // Header
    doc.fontSize(18).text("Admin Weekly Pay Later Invoice", { align: "center" });
    doc.moveDown();
    doc.fontSize(12).text(`Date: ${new Date().toLocaleDateString()}`, { align: "center" });

    // Table Header (optional in card design, but you can add a section title here)
    doc.moveDown();
    doc.font("Helvetica-Bold").text("Payment Details", { align: "center" });

    // Card layout for each payment
    let total = 0;
    payments.forEach((p, idx) => {
      total += p.amount;

      // Determine payment info
      const holderName = p.card?.bankHolderName || p.bank?.bankHolderName || "N/A";
      const accountNumber = p.card?.accountNumber || p.bank?.accountNumber || "N/A";
      const sortCode = p.bank?.sortCode || "-";
      
      // Page break if exceeding
      if (y > doc.page.height - 150) {
        doc.addPage();
        y = 50;
      }

      // Draw card for each payment entry
      const cardY = y;
      doc.rect(30, cardY, cardWidth, rowHeight).stroke(); // Card border

      // Card content
      doc.font("Helvetica-Bold").text(`User: ${p.user?.fullName || "N/A"}`, 40, cardY + 10);
      doc.font("Helvetica").text(`Email: ${p.user?.email || "N/A"}`, 40, cardY + 25);
      doc.text(`Type: ${p.type}`, 40, cardY + 40);
      doc.text(`Amount: $${p.amount.toFixed(2)}`, 40, cardY + 55);
      doc.text(`Holder Name: ${holderName}`, 250, cardY + 10);
      doc.text(`Account: ${accountNumber}`, 250, cardY + 25);

      // Show Sort Code only if type is "bank"
      if (p.type === "bank") {
        doc.text(`Sort Code: ${sortCode}`, 250, cardY + 40);
      }

      y += rowHeight + 20; // Move down for the next card
    });

    // Footer
    if (y > doc.page.height - 50) {
      doc.addPage();
      y = 50;
    }
    doc.font("Helvetica-Bold").text(`Total Due: $${total.toFixed(2)}`, 50, y + 10, {
      align: "right",
    });

    doc.end();
  });
};

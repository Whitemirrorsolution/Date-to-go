/**
 * InvoiceService — GST-compliant tax invoicing and PDF generation.
 * Generates GST invoice details (CGST/SGST/IGST, taxable value, reverse charge, HSN/SAC).
 */
import { env } from '../config/env.js';
import type { IUser } from '../models/User.js';
import type { IPlan } from '../models/Plan.js';
import type { IPayment } from '../models/Payment.js';

export interface InvoiceData {
  invoiceNumber: string;
  invoiceDate: string;
  company: {
    name: string;
    address: string;
    gstin: string;
    pan: string;
    state: string;
  };
  customer: {
    name: string;
    email: string;
    city: string;
    userId: string;
  };
  item: {
    description: string;
    sacCode: string; // 998439: Other online subscription services
    taxableAmountPaise: number;
    cgstRate: number;
    cgstAmountPaise: number;
    sgstRate: number;
    sgstAmountPaise: number;
    igstRate: number;
    igstAmountPaise: number;
    totalAmountPaise: number;
    totalAmountInRupees: string;
  };
  payment: {
    orderId: string;
    paymentId?: string | undefined;
    status: string;
    paidAt: string;
  };
}

export class InvoiceService {
  /**
   * Generates a sequential invoice number.
   * Format: DTG-INV-YYYYMM-XXXX
   */
  generateInvoiceNumber(seqNumber: number): string {
    const now = new Date();
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const seq = String(seqNumber).padStart(4, '0');
    return `${env.INVOICE_PREFIX}-${yearMonth}-${seq}`;
  }

  /**
   * Builds structured GST invoice data from User, Plan, and Payment models.
   */
  buildInvoiceData(user: IUser, plan: IPlan, payment: IPayment): InvoiceData {
    const totalPaise = payment.amountPaise;
    const gstRate = env.GST_RATE_PERCENT; // 18%

    // Calculate base taxable amount: Total / (1 + rate/100)
    const taxablePaise = Math.round(totalPaise / (1 + gstRate / 100));
    const totalGstPaise = totalPaise - taxablePaise;

    // Default to Intra-state split (CGST 9% + SGST 9%)
    const halfRate = gstRate / 2;
    const halfGstPaise = Math.round(totalGstPaise / 2);

    const now = payment.updatedAt || new Date();
    const invoiceNumber = payment.invoiceNumber || `DTG-INV-${now.getFullYear()}-${payment.id.toString().slice(-6).toUpperCase()}`;

    return {
      invoiceNumber,
      invoiceDate: now.toISOString().split('T')[0] ?? '',
      company: {
        name: env.COMPANY_NAME,
        address: env.COMPANY_ADDRESS,
        gstin: env.GSTIN,
        pan: env.GSTIN.slice(2, 12),
        state: 'Maharashtra (27)',
      },
      customer: {
        name: user.fullName || user.email?.split('@')[0] || 'Valued Customer',
        email: user.email || (user.phone ? `${user.phone}@datetogo.internal` : 'customer@datetogo.com'),
        city: user.city || 'India',
        userId: user.id.toString(),
      },
      item: {
        description: `Date to Go - ${plan.name} (${plan.audience} Plan, ${plan.durationDays} Days)`,
        sacCode: '998439',
        taxableAmountPaise: taxablePaise,
        cgstRate: halfRate,
        cgstAmountPaise: halfGstPaise,
        sgstRate: halfRate,
        sgstAmountPaise: totalGstPaise - halfGstPaise,
        igstRate: 0,
        igstAmountPaise: 0,
        totalAmountPaise: totalPaise,
        totalAmountInRupees: `₹${(totalPaise / 100).toFixed(2)}`,
      },
      payment: {
        orderId: payment.razorpayOrderId,
        paymentId: payment.razorpayPaymentId,
        status: payment.status,
        paidAt: now.toISOString(),
      },
    };
  }

  /**
   * Generates a minimal, valid standalone PDF binary buffer for the invoice.
   */
  generatePdfBuffer(invoice: InvoiceData): Buffer {
    const lines = [
      '%PDF-1.4',
      '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
      '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj',
      '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj',
      '5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj',
    ];

    const contentStream = [
      'BT',
      '/F1 18 Tf',
      '50 790 Td',
      `(${this.escapePdfText(invoice.company.name)} - TAX INVOICE) Tj`,
      '/F1 10 Tf',
      '0 -25 Td',
      `(${this.escapePdfText(invoice.company.address)}) Tj`,
      '0 -15 Td',
      `(GSTIN: ${this.escapePdfText(invoice.company.gstin)} | State: ${this.escapePdfText(invoice.company.state)}) Tj`,
      '0 -25 Td',
      `------------------------------------------------------------------------------------------------------------------------ Tj`,
      '0 -25 Td',
      `/F1 12 Tf`,
      `(Invoice No: ${this.escapePdfText(invoice.invoiceNumber)}    Date: ${invoice.invoiceDate}) Tj`,
      '/F1 10 Tf',
      '0 -20 Td',
      `(Billed To: ${this.escapePdfText(invoice.customer.name)} <${this.escapePdfText(invoice.customer.email)}>) Tj`,
      '0 -15 Td',
      `(City: ${this.escapePdfText(invoice.customer.city)}) Tj`,
      '0 -25 Td',
      `------------------------------------------------------------------------------------------------------------------------ Tj`,
      '0 -25 Td',
      `/F1 11 Tf`,
      `(Description: ${this.escapePdfText(invoice.item.description)}) Tj`,
      '0 -18 Td',
      `/F1 10 Tf`,
      `(SAC Code: ${invoice.item.sacCode}) Tj`,
      '0 -15 Td',
      `(Taxable Value: Rs. ${(invoice.item.taxableAmountPaise / 100).toFixed(2)}) Tj`,
      '0 -15 Td',
      `(CGST (${invoice.item.cgstRate}%): Rs. ${(invoice.item.cgstAmountPaise / 100).toFixed(2)}) Tj`,
      '0 -15 Td',
      `(SGST (${invoice.item.sgstRate}%): Rs. ${(invoice.item.sgstAmountPaise / 100).toFixed(2)}) Tj`,
      '0 -20 Td',
      `/F1 12 Tf`,
      `(TOTAL PAID: ${invoice.item.totalAmountInRupees}) Tj`,
      '0 -25 Td',
      `------------------------------------------------------------------------------------------------------------------------ Tj`,
      '/F1 9 Tf',
      '0 -20 Td',
      `(Razorpay Order ID: ${this.escapePdfText(invoice.payment.orderId)}) Tj`,
      '0 -15 Td',
      `(Razorpay Payment ID: ${this.escapePdfText(invoice.payment.paymentId || 'N/A')}) Tj`,
      '0 -15 Td',
      `(Payment Status: ${invoice.payment.status}) Tj`,
      '0 -30 Td',
      `(This is a computer-generated tax invoice and requires no physical signature.) Tj`,
      'ET',
    ].join('\n');

    const streamLength = Buffer.byteLength(contentStream, 'utf-8');
    lines.push(`4 0 obj << /Length ${streamLength} >> stream\n${contentStream}\nendstream\nendobj`);
    lines.push('xref');
    lines.push('0 6');
    lines.push('0000000000 65535 f ');
    lines.push('0000000009 00000 n ');
    lines.push('0000000058 00000 n ');
    lines.push('0000000115 00000 n ');
    lines.push('0000000300 00000 n ');
    lines.push('0000000234 00000 n ');
    lines.push('trailer << /Size 6 /Root 1 0 R >>');
    lines.push('startxref');
    lines.push('1200');
    lines.push('%%EOF');

    return Buffer.from(lines.join('\n'), 'utf-8');
  }

  private escapePdfText(str: string): string {
    return (str || '').replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
  }
}

export const invoiceService = new InvoiceService();

import type { CustomerBillTemplate, PrintableSalesBill } from "../types/customerBill.types";
import "./customerBill.css";

const currency = (amount: number) => `₹${amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function CustomerBillDocument({ template, bill }: { template: CustomerBillTemplate; bill: PrintableSalesBill }) {
  return (
    <article id="customer-bill-print" className={`customer-bill-document paper-${template.paperSize}`}>
      <header className="customer-bill-header">
        <div>
          <h1>{template.companyName || "Your Business Name"}</h1>
          {template.companyAddress ? <p>{template.companyAddress}</p> : null}
          {template.companyMobile ? <p>Phone: {template.companyMobile}</p> : null}
          {template.companyEmail ? <p>Email: {template.companyEmail}</p> : null}
          {template.taxRegistrationNumber ? <p>GSTIN / Tax ID: {template.taxRegistrationNumber}</p> : null}
        </div>
        <div className="customer-bill-title">
          <h2>{template.billTitle || "SALES INVOICE"}</h2>
          <strong>{bill.billNumber}</strong>
          <span>Date: {bill.billDate}</span>
        </div>
      </header>

      <section className="customer-bill-customer">
        <h3>Bill To</h3>
        <strong>{bill.customerName}</strong>
        <span>{bill.customerMobile}</span>
        {bill.customerAddress ? <span>{bill.customerAddress}</span> : null}
        {template.showCustomerEmail && bill.customerEmail ? <span>{bill.customerEmail}</span> : null}
      </section>

      <table className="customer-bill-items">
        <thead><tr><th>#</th><th>Description</th>{template.showSerialNumber ? <th>Serial No.</th> : null}<th className="number">Selling Price</th></tr></thead>
        <tbody><tr><td>1</td><td>{bill.productName || "Product"}</td>{template.showSerialNumber ? <td>{bill.serialNumber || "—"}</td> : null}<td className="number">{currency(bill.sellingPrice)}</td></tr></tbody>
      </table>

      <div className="customer-bill-summary">
        <div className="customer-bill-payment-history">
          {template.showPaymentHistory ? <>
            <h3>Payment history</h3>
            {bill.payments.length ? bill.payments.map((payment) => <p key={payment.id}>{payment.paymentDate} · {payment.paymentMode}{payment.referenceNumber ? ` · ${payment.referenceNumber}` : ""}<strong>{currency(payment.amount)}</strong></p>) : <p>No payments recorded</p>}
          </> : null}
        </div>
        <dl>
          <div><dt>Selling price</dt><dd>{currency(bill.sellingPrice)}</dd></div>
          {template.showDiscount && bill.discount > 0 ? <div><dt>Discount</dt><dd>− {currency(bill.discount)}</dd></div> : null}
          <div><dt>Taxable amount</dt><dd>{currency(bill.taxableAmount)}</dd></div>
          {bill.cgstAmount > 0 ? <div><dt>CGST ({bill.cgstRate}%)</dt><dd>{currency(bill.cgstAmount)}</dd></div> : null}
          {bill.sgstAmount > 0 ? <div><dt>SGST ({bill.sgstRate}%)</dt><dd>{currency(bill.sgstAmount)}</dd></div> : null}
          <div className="customer-bill-grand-total"><dt>Bill total</dt><dd>{currency(bill.totalAmount)}</dd></div>
          <div><dt>Received</dt><dd>{currency(bill.amountPaid)}</dd></div>
          {template.showBalanceDue ? <div><dt>Balance due</dt><dd>{currency(bill.balance)}</dd></div> : null}
        </dl>
      </div>

      <footer className="customer-bill-footer">
        <p>{template.footerNote || "Thank you for your business."}</p>
        <span>Customer acknowledgement</span>
      </footer>
    </article>
  );
}

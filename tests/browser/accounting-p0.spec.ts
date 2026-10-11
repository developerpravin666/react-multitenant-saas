import { test, expect, type Page } from "@playwright/test";

const permissions = ["catalog.manage","purchases.manage","sales.manage","inventory.manage","accounting.manage"];
async function fixture(page: Page, owner = true) {
  await page.addInitScript(() => {
    localStorage.setItem("auth_session",JSON.stringify({token:"fixture",tenantId:"fixture-tenant",user:{username:"fixture"}}));
    localStorage.setItem("auth_token","fixture");localStorage.setItem("tenant_id","fixture-tenant");
  });
  const posted: { path: string; body: Record<string,unknown> }[] = [];
  const notes: Record<string,unknown>[] = [];
  let staff: Record<string,unknown>[] = [];
  const item = { id:"s1",billNumber:"SALE-1",serialNumber:"SERIAL-1",productName:"Phone",customerName:"Original buyer",customerMobile:"9000000000",customerAddress:"Original address",billDate:"2026-01-02",sellingPrice:1000,discount:0,taxableAmount:1000,cgstRate:9,cgstAmount:90,sgstRate:9,sgstAmount:90,totalAmount:1180,amountPaid:1180,balance:0,paymentStatus:"Paid" };
  await page.route("**/api/**", async route => {
    const request=route.request();const path=new URL(request.url()).pathname.replace(/^.*\/api/,"");
    let data:unknown=[];
    if(request.method()==="POST" || request.method()==="PUT") {
      const body=request.postDataJSON();posted.push({path,body});
      if(path==="/accounting/corrections")notes.push({id:"n1",sourceId:body.sourceId,kind:body.kind,billNumber:"SALE-1",noteNumber:"CN-1",noteDate:body.noteDate,reason:body.reason,disposition:body.disposition,totalAmount:1180,taxableAmount:1000,cgstRate:9,sgstRate:9,cgstAmount:90,sgstAmount:90,refunded:0,refundAvailable:1180});
      if(path.endsWith("/refunds")){notes[0].refunded=body.amount;notes[0].refundAvailable=1180-Number(body.amount);}
      if(path==="/accounting/staff/invitations")staff=[{id:"u1",...body,isOwner:false,isActive:false,emailVerified:false}];
      data={id:"s1"};
    } else if(path==="/accounting/access")data={isOwner:owner,permissions:owner?permissions:[]};
    else if(path==="/accounting/corrections")data=notes;
    else if(path==="/accounting/corrections/n1/refunds")data=notes[0]?.refunded?[{id:"r1",paymentDate:"2026-01-03",amount:notes[0].refunded,paymentMode:"Cash",reference:"REFUND-1"}]:[];
    else if(path==="/accounting/staff")data=staff;
    else if(path==="/accounting-permissions")data=staff.map(s=>({userId:s.id,permissions:[]}));
    else if(path==="/sales/accounting/bills")data={items:[item],page:1,pageSize:100,totalCount:1,totalPages:1};
    else if(path==="/sales/invoices")data={items:[],page:1,pageSize:100,totalCount:0,totalPages:0};
    else if(path==="/sales/accounting/bills/s1")data={bill:item,payments:[]};
    else if(path==="/products/all")data=[{id:"p1",brand:"Brand",productModel:"Phone",variant:"128GB",color:"Blue",serialNumber:"SERIAL-1",totalAmount:1180,cgst:9,sgst:9}];
    else if(path==="/taxes/all")data=[{id:"t1",cgst:9,sgst:9,totalTax:18}];
    else if(path==="/settings/customer-bill")data={companyName:"Changed shop",paperSize:"A4",billTitle:"SALES INVOICE",showCustomerEmail:true,showSerialNumber:true,showDiscount:true,showPaymentHistory:true,showBalanceDue:true};
    else if(path==="/accounting/snapshots/Sale/s1")data={partyName:"Original buyer",partyMobile:"9000000000",partyAddress:"Original address",productName:"Phone",serialNumber:"SERIAL-1",reconstructed:false,detailsJson:JSON.stringify({seller:{companyName:"Frozen shop",companyAddress:"Original shop address"}})};
    else if(path==="/general-ledger/accounts")data=[{id:"ar",code:"1100",name:"Receivables",type:0}];
    else if(path==="/accounting/opening-customers")data=[{id:"c1",name:"Buyer"}];
    else if(path==="/accounting/reconciliation")data={asOf:"2026-01-01",receivableSubledger:0,receivableLedger:0,receivableDifference:0,payableSubledger:0,payableLedger:0,payableDifference:0,stockSubledger:0,stockLedger:0,stockDifference:0};
    await route.fulfill({status:200,contentType:"application/json",headers:{"Access-Control-Allow-Origin":"*"},body:JSON.stringify(data)});
  });
  return posted;
}

test("sale selection fills GST-inclusive cost, keeps edited selling price, and submits converted invoice values",async({page})=>{
  const posted=await fixture(page);await page.goto("/sales/products/add");
  await page.getByLabel("Product (name or serial number)").click();await page.getByRole("option",{name:/SERIAL-1/}).click();
  await expect(page.getByLabel("Purchase Price (including GST)")).toHaveValue("1180");
  await expect(page.getByLabel("GST rate")).toHaveValue("CGST 9% + SGST 9%");
  await page.getByLabel("Selling Price (including GST)").fill("1000");
  await page.getByLabel("Customer Name or Mobile").fill("Buyer");await page.getByLabel("Mobile Number").fill("9000000000");await page.getByRole("textbox",{name:"Address",exact:true}).fill("Buyer address");
  await expect(page.getByLabel("Selling Price (including GST)")).toHaveValue("1000");await expect(page.getByLabel("Discount (including GST)")).toHaveValue("180");
  await page.getByRole("button",{name:"Create Sale",exact:true}).click();
  await expect.poll(()=>posted.find(p=>p.path==="/sales/products")).toBeTruthy();
  const payload=posted.find(p=>p.path==="/sales/products")!.body;expect(payload.taxId).toBe("t1");expect(payload.discount).toBe(152.54);expect(payload.sellingPrice).toBe(1000);
});

test("return and refund forms retain the source and send ledger-safe requests",async({page})=>{
  const posted=await fixture(page);await page.goto("/accounting/corrections");
  await expect(page.getByLabel("Invoice / purchase unit").locator("option")).toHaveCount(2);
  await page.getByLabel("Invoice / purchase unit").selectOption("s1");await page.getByLabel("Reason",{exact:true}).fill("Customer return");
  await page.getByRole("button",{name:"Post credit note"}).click();await expect(page.getByRole("cell",{name:/^CN-1/})).toBeVisible();
  await page.getByRole("button",{name:"Record refund"}).click();await page.getByLabel("Amount",{exact:true}).fill("100.25");await page.getByRole("button",{name:"Save refund"}).click();
  await expect.poll(()=>posted.some(p=>p.path==="/accounting/corrections/n1/refunds")).toBe(true);
  expect(posted.find(p=>p.path==="/accounting/corrections")!.body).toMatchObject({kind:"Sale",sourceId:"s1",reason:"Customer return",disposition:"Restock"});
  expect(posted.find(p=>p.path==="/accounting/corrections/n1/refunds")!.body.amount).toBe(100.25);
  await page.getByRole("button",{name:"View note"}).click();
  const note=page.getByRole("dialog",{name:"Credit or debit note"});
  await expect(note).toContainText("Original buyer");await expect(note).toContainText("CGST reversal (9%)");await expect(note).toContainText("REFUND-1");
  await expect(note.getByRole("button",{name:"Print / save PDF"})).toBeVisible();
});

test("opening import submits matching GL and customer outstanding items",async({page})=>{
  const posted=await fixture(page);await page.goto("/accounting/opening-balances");
  await page.getByLabel("Account 1").selectOption("ar");await page.getByLabel("debit",{exact:true}).fill("200");
  await page.getByRole("button",{name:"Add outstanding item"}).click();await page.getByLabel("Party",{exact:true}).selectOption("c1");await page.getByPlaceholder("Invoice reference").fill("OLD-SALE");await page.getByLabel("Opening amount").fill("200");
  await page.getByRole("button",{name:"Post reconciled opening balances"}).click();await expect.poll(()=>posted.some(p=>p.path==="/general-ledger/opening-balances")).toBe(true);
  expect(posted.find(p=>p.path==="/general-ledger/opening-balances")!.body).toMatchObject({lines:[{accountId:"ar",debit:200,credit:0}],parties:[{kind:"Customer",partyId:"c1",reference:"OLD-SALE",amount:200}],stockProductIds:[]});
});

test("staff invitations show pending verification and do not grant permissions",async({page})=>{
  const posted=await fixture(page);await page.goto("/accounting/staff");await page.getByLabel("Username",{exact:true}).fill("staff");await page.getByLabel("Email",{exact:true}).fill("staff@example.com");await page.getByLabel("Mobile",{exact:true}).fill("9000000001");
  await page.getByRole("button",{name:"Send invitation"}).click();await expect(page.getByText("Invited",{exact:true})).toBeVisible();expect(posted[0].path).toBe("/accounting/staff/invitations");
  await expect(page.getByLabel("sales.manage",{exact:true})).toBeDisabled();
});

test("ungranted staff cannot open sale add and owner navigation is hidden",async({page})=>{
  await fixture(page,false);await page.goto("/sales/products/add");await expect(page.getByRole("alert")).toContainText("sales.manage");
  await expect(page.getByRole("link",{name:"Staff Access"})).toHaveCount(0);
});

test("printed seller details come from the frozen invoice snapshot",async({page})=>{
  await fixture(page);await page.goto("/sales/accounting/print/s1");await expect(page.getByText("Frozen shop",{exact:true})).toBeVisible();await expect(page.getByText("Changed shop",{exact:true})).toHaveCount(0);await expect(page.getByText("Original buyer",{exact:true})).toBeVisible();
});

test("multi-line invoice printing freezes buyer and seller and includes HSN and unit", async ({page}) => {
  await fixture(page);
  await page.route("**/api/sales/invoices/i1", route => route.fulfill({contentType:"application/json",body:JSON.stringify({
    invoice:{id:"i1",billNumber:"INV-1",customerName:"Changed buyer",customerMobile:"9000000000",customerAddress:"Changed address",invoiceDate:"2026-02-01",dueDate:"2026-02-01",subTotal:100,discount:0,taxableAmount:100,cgstAmount:9,sgstAmount:9,igstAmount:0,totalAmount:118,amountPaid:0,balance:118,supplyType:0},
    lines:[{id:"l1",lineNumber:1,itemDescription:"Phone",hsnSac:"8517",unitOfMeasure:"NOS",quantity:1,unitPrice:100,discount:0,cgstRate:9,sgstRate:9,igstRate:0,cgstAmount:9,sgstAmount:9,totalAmount:118}],payments:[]})}));
  await page.route("**/api/accounting/snapshots/Sale/i1", route => route.fulfill({contentType:"application/json",body:JSON.stringify({partyName:"Frozen buyer",partyMobile:"9000000001",partyAddress:"Frozen address",detailsJson:JSON.stringify({seller:{companyName:"Frozen shop",paperSize:"A4",billTitle:"TAX INVOICE",showSerialNumber:true}})})}));
  await page.goto("/sales/invoices/i1/print");
  await expect(page.locator("#customer-bill-print")).toContainText("Frozen buyer");
  await expect(page.locator("#customer-bill-print")).toContainText("Frozen shop");
  await expect(page.locator("#customer-bill-print")).toContainText("8517");
  await expect(page.locator("#customer-bill-print")).toContainText("NOS");
  await expect(page.locator("#customer-bill-print")).not.toContainText("Changed buyer");
});

test("lost money response retains the same retry key", async ({page}) => {
  await fixture(page); await page.goto("/sales/invoices");
  const keys:string[]=[];
  await page.route("**/api/sales/invoices", async route => {
    keys.push(route.request().headers()["idempotency-key"] ?? "");
    if(keys.length===1) await route.abort("failed");
    else await route.fulfill({contentType:"application/json",body:JSON.stringify({invoice:{id:"retry-id"}})});
  });
  const outcome=await page.evaluate(async()=>{
    // Exercise the shared client used by invoice and payment forms through Vite's module server.
    const path="/src/services/apiClient.ts";
    const {apiClient}=await import(/* @vite-ignore */ path);
    const body={customerName:"Retry buyer",amount:10.25};
    try {await apiClient.post("/sales/invoices",body);} catch {}
    return await apiClient.post("/sales/invoices",body);
  });
  expect(keys).toHaveLength(2); expect(keys[0]).toMatch(/^[0-9a-f-]{36}$/); expect(keys[1]).toBe(keys[0]);
  expect(outcome).toMatchObject({invoice:{id:"retry-id"}});
});

test("authentication refresh preserves the money retry key", async ({page}) => {
  await fixture(page); await page.goto("/sales/invoices");
  const keys:string[]=[];
  await page.route("**/api/sales/invoices", async route => {
    keys.push(route.request().headers()["idempotency-key"] ?? "");
    await route.fulfill({status:keys.length===1 ? 401 : 200, contentType:"application/json",
      body:JSON.stringify(keys.length===1 ? {message:"Expired session"} : {invoice:{id:"refreshed-id"}})});
  });
  const outcome=await page.evaluate(async()=>{
    const path="/src/services/apiClient.ts";
    const {apiClient,setUnauthorizedHandler}=await import(/* @vite-ignore */ path);
    const cleanup=setUnauthorizedHandler(async()=>true);
    try { return await apiClient.post("/sales/invoices",{amount:15.25}); }
    finally { cleanup(); }
  });
  expect(keys).toHaveLength(2); expect(keys[0]).toMatch(/^[0-9a-f-]{36}$/); expect(keys[1]).toBe(keys[0]);
  expect(outcome).toMatchObject({invoice:{id:"refreshed-id"}});
});

test("accessory inventory form creates SKU and receives supplier stock", async ({page}) => {
 const posted=await fixture(page);
 const sku={id:"sku1",code:"CHARGER",name:"Charger",hsnSac:"8504",unitOfMeasure:"NOS",quantity:0,inventoryValue:0};
 await page.route("**/api/inventory/skus",route=>route.request().method()==="GET" ? route.fulfill({contentType:"application/json",body:JSON.stringify([sku])}) : route.fallback());
 for(const path of ["inventory/movements","products","vendors","taxes"]){
  await page.route(`**/api/${path}?**`,route=>route.fulfill({contentType:"application/json",body:JSON.stringify({items:path==="vendors"?[{id:"v1",name:"Supplier"}]:path==="taxes"?[{id:"t1",cgst:9,sgst:9}]:[],page:1,totalPages:1,totalCount:0})}));
 }
 await page.goto("/purchase/stock-movements");
 await page.getByLabel("SKU code",{exact:true}).fill("CHARGER");await page.getByLabel("SKU name",{exact:true}).fill("Charger");await page.getByLabel("SKU HSN",{exact:true}).fill("8504");
 await page.getByRole("button",{name:"Create SKU",exact:true}).click();
 await expect.poll(()=>posted.filter(p=>p.path==="/inventory/skus").length).toBe(1);
 const receive=page.locator("form").filter({has:page.getByRole("button",{name:"Receive stock",exact:true})});
 await receive.getByLabel("Stock SKU",{exact:true}).selectOption("sku1");await receive.getByLabel("SKU supplier",{exact:true}).selectOption("v1");await receive.getByLabel("Supplier bill",{exact:true}).fill("SKU-P1");
 await receive.getByLabel("Stock quantity",{exact:true}).fill("10");await receive.getByLabel("SKU unit cost",{exact:true}).fill("12.25");await receive.getByLabel("Purchase GST rate",{exact:true}).selectOption("t1");
 await receive.getByRole("button",{name:"Receive stock",exact:true}).click();
 await expect.poll(()=>posted.filter(p=>p.path==="/inventory/skus/receipts").length).toBe(1);
 expect(posted.find(p=>p.path==="/inventory/skus/receipts")?.body).toMatchObject({skuId:"sku1",vendorId:"v1",billNumber:"SKU-P1",quantity:10,unitCost:12.25,taxId:"t1",interState:false});
});

test("missing supplier state is displayed explicitly on invoice", async ({page}) => {
 await fixture(page);await page.goto("/sales/invoices/new");
 await expect(page.getByText(/Not configured.*set Home State in Customer Bill settings/)).toBeVisible();
});

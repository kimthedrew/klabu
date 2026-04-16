// Terms & Conditions versions. Bump a date to force re-acceptance.
export const TERMS_VERSIONS = {
  BUYER: '2026-04-16',
  STALL_OWNER: '2026-04-16',
  DELIVERY_PERSON: '2026-04-16',
} as const;

export const BUYER_TERMS = `
1. Order Placement. By placing an order you confirm that the details you provide (name, phone, delivery location) are accurate and complete.

2. Payment. Payment must be completed as instructed by the stall. Orders not paid within a reasonable time may be cancelled by the stall owner.

3. Delivery. Delivery fees are non-refundable once a delivery person has been assigned. Delivery times are estimates and may vary based on demand.

4. Refunds. Refund requests must be made directly to the stall owner. Klabu is not liable for order quality disputes between customers and stalls.

5. Privacy. Your contact details are shared with the stall owner and the assigned delivery person solely for order fulfillment.

6. Conduct. You agree to treat delivery persons and stall staff with respect. Abusive behaviour may result in being barred from the platform.

7. Acceptance. Use of the ordering system constitutes acceptance of these terms.
`.trim();

export const STALL_OWNER_TERMS = `
1. Registration. You confirm that all information provided during registration is accurate. You must be authorised to operate a food stall on the campus.

2. Admin Approval. Your stall becomes active only after approval by a Klabu administrator. Klabu reserves the right to revoke approval at any time.

3. Menu & Pricing. You are responsible for keeping your menu accurate and available items up to date. Prices listed must match what customers are charged.

4. Order Management. You are responsible for timely confirmation of payments and preparation of orders. Failure to manage orders may result in suspension.

5. Delivery Fees. A platform delivery fee is charged per order to cover the cost of delivery persons. Klabu retains a commission as disclosed in the admin dashboard.

6. Payments. You must maintain a valid M-Pesa number or till for receiving payments. Klabu is not responsible for failed or incorrect payments.

7. Conduct. You agree to treat customers and delivery persons with professionalism and respect.

8. Suspension. Klabu may suspend or terminate stall access for violations of these terms, fraud, or repeated customer complaints.
`.trim();

export const DELIVERY_PERSON_TERMS = `
1. Registration. You confirm that all information provided (ID number, photo) is accurate and that you are eligible to work as a delivery person.

2. Admin Approval. You may only start accepting deliveries after approval by a Klabu administrator.

3. Delivery Tiers. You may receive Fast deliveries (one order at a time) or Standard deliveries (up to three simultaneous orders). The tier is set by the customer at checkout.

4. Earnings. You earn a portion of each delivery fee as shown in your dashboard. Klabu retains a platform commission. Earnings are settled periodically by the admin.

5. Conduct. You agree to be professional, punctual, and respectful to customers and stall owners at all times.

6. Active Status. You are responsible for toggling your active status accurately. Accepting assignments you cannot fulfil negatively affects your rating.

7. Ratings. Your performance is tracked via a rating system. Low ratings may affect the priority with which you receive assignments.

8. Suspension. Klabu may suspend or terminate access for violations of these terms, misconduct, or sustained low ratings.
`.trim();

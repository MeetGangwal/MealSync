# Administration, reporting and test data

## Administrator accounts

- Registration (`POST /api/auth/register`) always creates a student (`ROLE_USER`). Any `role` field in the request is ignored.
- The role is read from the database on every request, so a promotion or demotion takes effect on the next API call. The UI rechecks `/api/auth/me` every 60 s and whenever the tab becomes visible.
- Administrators keep every student feature (ordering, subscriptions, QR tickets).

### Bootstrap the first administrator

1. Register the account normally through the app.
2. Set `MEALSYNC_BOOTSTRAP_ADMIN_EMAIL=<that email>` in `.env` (never commit `.env`).
3. Restart the backend: `docker compose up -d backend`.

On startup `AdminBootstrap` does one of the following:

| State | Result |
|---|---|
| Variable unset | Logs "not set; skipping administrator bootstrap" |
| No account with that email | Logs a warning; no account is created |
| Account is a student | Promoted to `ROLE_ADMIN` |
| Account is already an administrator | No change |

After that, manage roles in **Users & Roles**. The server refuses to remove the last administrator.

## Financial definitions

One order is one transaction: payment state lives on the order. The backend (`ReportingService`) is the only place these categories are computed. Overview, Payment Records and Analytics all use it, so their figures always agree.

| Category | Rule |
|---|---|
| Collected | `paymentStatus = PAID` and the order is not cancelled |
| Pending | `paymentStatus` is `PENDING_CASH` or `PENDING` (cash at pickup) |
| Refunded | `paymentStatus = REFUNDED`, or a cancelled order that had been paid |
| Cancelled (unpaid) | Cancelled before any payment was taken |
| Failed | Declined payments are rolled back and never stored, so this count is 0 |

- **Business day:** Asia/Kolkata (`mealsync.time-zone`). Timestamps are stored in the server zone and converted, so an order at 00:30 IST counts on that IST day.
- **Admin cancellation:** sets a paid order to `REFUNDED` and anything else to `CANCELLED`. It restores stock under a row lock.
- **Completing a cash order:** marks a `PENDING_CASH` order as `PAID`.
- **Item names:** a snapshot is stored per order item (`order_items.item_name`), so renaming or deleting a product does not change history. Older rows fall back to the current product name, or to "Item unavailable".
- **Demand forecast:** a labelled estimate (simple moving average), not an AI model.

## Pickup slots

- Slots live in `pickup_slots`, seeded idempotently on startup. Admins edit capacity, open/close and add slots in **Pickup Slots**.
- Capacity is enforced when an order is placed: the slot row is locked and today's bookings are counted with a locking read, so two concurrent orders cannot overfill a slot.

## Monitoring

**Cloud Monitoring** shows only live Micrometer metrics of the backend instance that answered: CPU, heap, HikariCP, request count, latency and 5xx rate.

- Per-container metrics are in Grafana (cAdvisor).
- Kubernetes and AWS are shown as not connected unless that is actually true.
- Active users and QR verifications are listed as not measured.

## Test / demo records (cleanup recommendation — review only)

The records named "Smoke Test", "Smoke Promo", "k6 Load Test", "E2E …" and "Priya Student" (all `@example.com`) were created by `scripts/smoke-test.sh`, the k6 load test and the end-to-end runs against the development Compose database.

- They do not come from `DataSeeder`; demo seeding is off by default.
- Every smoke-test run adds one more student and one cancelled/refunded order.

**Nothing has been deleted.** If you decide to remove them:

1. **Back up first:**
   ```bash
   docker exec mealsync-db sh -c 'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysqldump -uroot "$MYSQL_DATABASE"' > mealsync-backup.sql
   ```
2. **Preview** in a MySQL shell (`docker exec -it mealsync-db mysql -uroot -p mealsync`):
   ```sql
   SELECT id, name, email, role FROM users WHERE email LIKE '%@example.com';
   SELECT o.id, o.order_number, o.payment_status, o.total_amount
   FROM orders o JOIN users u ON u.id = o.user_id WHERE u.email LIKE '%@example.com';
   ```
3. **Delete inside one transaction** after checking the preview. Child rows go first.
   ```sql
   START TRANSACTION;
   DELETE oi FROM order_items oi JOIN orders o ON o.id = oi.order_id
     JOIN users u ON u.id = o.user_id WHERE u.email LIKE '%@example.com';
   DELETE o FROM orders o JOIN users u ON u.id = o.user_id WHERE u.email LIKE '%@example.com';
   DELETE s FROM meal_subscriptions s JOIN users u ON u.id = s.user_id WHERE u.email LIKE '%@example.com';
   DELETE FROM users WHERE email LIKE '%@example.com';
   -- check the counts, then COMMIT; (or ROLLBACK;)
   ```

Removing the paid test orders changes historical totals. Consider keeping them, or exporting them first. The `E2E Verification Admin` account is a test administrator; demote or remove it before any shared deployment.

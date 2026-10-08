import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { PGlite } from '@electric-sql/pglite';

const sql = async (name) => readFile(new URL(`../${name}`, import.meta.url), 'utf8');

test('payment integrity migration and database permissions', async (t) => {
  const db = new PGlite();
  t.after(() => db.close());
  await db.exec(`
    create role anon;
    create role authenticated;
    create schema auth;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql as
      $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth to authenticated, anon;
    grant execute on function auth.uid() to authenticated, anon;
  `);
  await db.exec((await sql('supabase-schema.sql')).replace('create extension if not exists pgcrypto;', ''));
  await db.exec('grant usage on schema public to authenticated, anon; grant all on all tables in schema public to authenticated, anon;');
  await db.exec(await sql('supabase-rls-policies.sql'));
  const migration = await sql('supabase-payment-integrity-migration.sql');
  await db.exec(migration);
  const admin = randomUUID();
  const staff = randomUUID();
  const inactive = randomUUID();
  const outsider = randomUUID();
  await db.query('insert into auth.users(id) values ($1), ($2), ($3), ($4)', [admin, staff, inactive, outsider]);
  for (const [userId, role, status] of [[admin, 'admin', 'active'], [staff, 'staff', 'active'], [inactive, 'staff', 'inactive']]) {
    await db.query('insert into profiles(user_id, full_name, role, status) values ($1, $2, $3, $4)', [userId, role, role, status]);
  }
  const student = (await db.query("insert into students(lrn, first_name) values ('123', 'Test') returning id")).rows[0].id;
  const otherStudent = (await db.query("insert into students(lrn) values ('456') returning id")).rows[0].id;
  const year = (await db.query("insert into school_years(school_year, status) values ('2026-2027', 'active') returning id")).rows[0].id;
  const grade = (await db.query("insert into grade_levels(grade_name) values ('Grade I') returning id")).rows[0].id;
  const enrollment = (await db.query("insert into enrollments(student_id, school_year_id, grade_level_id, enrollment_status, enrollment_date) values ($1, $2, $3, 'pending', '2026-10-06') returning id", [student, year, grade])).rows[0].id;
  const fee = (await db.query("insert into fees(fee_name, amount, school_year_id) values ('Enrollment', 100, $1) returning id", [year])).rows[0].id;
  const tuition = (await db.query("insert into fees(fee_name, amount, school_year_id) values ('Tuition', 200, $1) returning id", [year])).rows[0].id;
  await db.query("insert into student_fees(student_id, enrollment_id, fee_id, amount, status) values ($1, $2, $3, 100, 'unpaid'), ($1, $2, $4, 200, 'unpaid')", [student, enrollment, fee, tuition]);

  async function asUser(userId, fn) {
    await db.query("select set_config('request.jwt.claim.sub', $1, false)", [userId]);
    await db.exec('set role authenticated');
    try { return await fn(); } finally { await db.exec('reset role'); }
  }
  async function record(userId, allocations, requestId = randomUUID(), enrollmentId = enrollment) {
    return asUser(userId, async () => (await db.query(
      "select public.record_payment($1, $2::jsonb, '2026-10-06', 'test payment', $3) as payment",
      [enrollmentId, JSON.stringify(allocations), requestId],
    )).rows[0].payment);
  }
  const allocation = (amount, feeId = fee) => ({ fee_id: feeId, amount_paid: amount });
  const count = async () => Number((await db.query('select count(*) from payments')).rows[0].count);

  await t.test('outsiders and inactive accounts cannot record payments', async () => {
    for (const user of [outsider, inactive]) {
      await assert.rejects(record(user, [allocation(10)]), /active admin or staff/);
    }
    assert.equal(await count(), 0);
  });

  await t.test('rejects duplicate, negative, fractional-cent and unassessed allocations', async () => {
    for (const [values, pattern] of [
      [[allocation(10), allocation(10)], /only occur once/],
      [[allocation(-1)], /positive/], [[allocation(0.001)], /decimal places/],
      [[allocation(10, randomUUID())], /not assessed/], [[], /at least one/],
    ]) await assert.rejects(record(admin, values), pattern);
    assert.equal(await count(), 0);
  });

  await t.test('late database failure rolls back header, allocations and statuses', async () => {
    await db.exec(`create function public.fail_test_detail() returns trigger language plpgsql as
      $$ begin raise exception 'simulated detail failure'; end $$;
      create trigger fail_test_detail before insert on payment_details for each row execute function public.fail_test_detail();`);
    await assert.rejects(record(admin, [allocation(30)]), /simulated detail failure/);
    assert.equal(await count(), 0);
    assert.equal((await db.query('select status from student_fees where fee_id = $1', [fee])).rows[0].status, 'unpaid');
    await db.exec('drop trigger fail_test_detail on payment_details; drop function public.fail_test_detail();');
  });

  await t.test('staff payment updates balances and identical retry returns the same receipt', async () => {
    const requestId = randomUUID();
    const first = await record(staff, [allocation(40)], requestId);
    const retry = await record(staff, [allocation(40)], requestId);
    assert.deepEqual(retry, first);
    assert.equal(await count(), 1);
    assert.equal((await db.query('select status from student_fees where fee_id = $1', [fee])).rows[0].status, 'partial');
    await assert.rejects(record(staff, [allocation(41)], requestId), /different payment/);
    await assert.rejects(record(admin, [allocation(40)], requestId), /different payment/);
  });

  await t.test('rejects stale overpayment, completes enrollment, and pays multiple fees atomically', async () => {
    await assert.rejects(record(admin, [allocation(61)]), /exceeds the current fee balance/);
    assert.equal(await count(), 1);
    await record(admin, [allocation(60), allocation(100, tuition)]);
    assert.equal(await count(), 2);
    assert.equal((await db.query('select enrollment_status from enrollments where id = $1', [enrollment])).rows[0].enrollment_status, 'enrolled');
    assert.equal((await db.query('select status from student_fees where fee_id = $1', [fee])).rows[0].status, 'paid');
    assert.equal((await db.query('select status from student_fees where fee_id = $1', [tuition])).rows[0].status, 'partial');
    await assert.rejects(record(staff, [allocation(1)]), /exceeds/);
  });

  await t.test('direct financial writes remain blocked after old policies and grants are reapplied', async () => {
    await db.exec(await sql('supabase-rls-policies.sql'));
    await db.exec('grant insert, update, delete on payments, payment_details to authenticated;');
    await asUser(staff, async () => {
      await assert.rejects(db.query('insert into payment_details(payment_id, fee_id, amount_paid) select id, $1, 10 from payments limit 1', [tuition]), /row-level security/);
      assert.equal((await db.query('delete from payments returning id')).rows.length, 0);
      assert.equal((await db.query('update payments set payment_amount = 1 returning id')).rows.length, 0);
      assert.equal((await db.query('delete from students where id = $1 returning id', [otherStudent])).rows.length, 0);
    });
    assert.equal(await count(), 2);
  });

  await t.test('preserves paid history, restricts deletion to admins and deletes unpaid students atomically', async () => {
    await assert.rejects(asUser(staff, () => db.query('select public.delete_unpaid_student($1)', [otherStudent])), /Only active admins/);
    await assert.rejects(asUser(admin, () => db.query('select public.delete_unpaid_student($1)', [student])), /payment history/);
    assert.equal(await count(), 2);
    const newStudent = (await db.query("insert into students(lrn) values ('789') returning id")).rows[0].id;
    const newEnrollment = (await db.query("insert into enrollments(student_id, school_year_id, enrollment_status, enrollment_date) values ($1, $2, 'pending', '2026-10-06') returning id", [newStudent, year])).rows[0].id;
    await db.query("insert into student_fees(student_id, enrollment_id, fee_id, amount, status) values ($1, $2, $3, 100, 'unpaid')", [newStudent, newEnrollment, fee]);
    await asUser(admin, () => db.query('select public.delete_unpaid_student($1)', [newStudent]));
    assert.equal((await db.query('select id from students where id = $1', [newStudent])).rows.length, 0);
    assert.equal((await db.query('select id from enrollments where id = $1', [newEnrollment])).rows.length, 0);
    assert.equal(await count(), 2);
  });

  await t.test('constraints protect profile uniqueness, enrollments and assessed/payment amounts', async () => {
    await assert.rejects(db.query("insert into profiles(user_id, role, status) values ($1, 'admin', 'active')", [admin]), /duplicate key/);
    await assert.rejects(db.query("insert into enrollments(student_id, school_year_id, enrollment_status, enrollment_date) values ($1, $2, 'pending', '2026-10-06')", [student, year]), /duplicate key/);
    await assert.rejects(db.query('update student_fees set amount = 10 where fee_id = $1', [fee]), /repriced/);
    await assert.rejects(db.query('delete from student_fees where fee_id = $1', [fee]), /cannot be deleted/);
    await assert.rejects(db.query('update enrollments set student_id = $1 where id = $2', [otherStudent, enrollment]), /conflict|reassigned/);
    await assert.rejects(db.query('update fees set amount = -1 where id = $1', [fee]), /check constraint/);
    await assert.rejects(db.query('update fees set amount = 0.001 where id = $1', [fee]), /check constraint/);
    await assert.rejects(db.query('update student_fees set student_id = $1 where enrollment_id = $2', [otherStudent, enrollment]), /reassigned/);
    await assert.rejects(db.query('update fees set grade_level_id = $1 where id = $2', [grade, fee]), /cannot be moved/);
    await asUser(staff, () => db.query("update student_fees set status = 'paid' where fee_id = $1", [tuition]));
    assert.equal((await db.query('select status from student_fees where fee_id = $1', [tuition])).rows[0].status, 'partial');
  });

  await t.test('staff imports are atomic, including a failure on a later student', async () => {
    await db.query("update fees set status = 'active' where id in ($1, $2)", [fee, tuition]);
    const importStudents = (students, yearId = year) => asUser(staff, () => db.query(
      "select enroll_new_students($1::jsonb, $2, $3, null, '2026-10-06', 'enrolled') as count",
      [JSON.stringify(students), yearId, grade],
    ));
    const studentRow = (lrn) => ({ lrn, first_name: 'Imported', last_name: 'Student' });
    await assert.rejects(importStudents([studentRow('atomic-rollback'), studentRow('123')]), /duplicate key/);
    assert.equal((await db.query("select id from students where lrn = 'atomic-rollback'")).rows.length, 0);
    await assert.rejects(importStudents([studentRow('invalid-year')], randomUUID()), /foreign key/);
    assert.equal((await db.query("select id from students where lrn = 'invalid-year'")).rows.length, 0);
    const result = await importStudents([studentRow('import-1'), studentRow('import-2')]);
    assert.equal(result.rows[0].count, 2);
    const enrolled = await db.query("select e.enrollment_status, count(sf.id) as assessments from enrollments e join students s on s.id = e.student_id left join student_fees sf on sf.enrollment_id = e.id where s.lrn in ('import-1', 'import-2') group by e.id");
    assert.equal(enrolled.rows.length, 2);
    for (const row of enrolled.rows) {
      assert.equal(row.enrollment_status, 'enrolled');
      assert.equal(Number(row.assessments), 2);
    }
  });

  await t.test('migration can be reapplied to valid payment history', async () => {
    await db.exec(migration);
    assert.equal(await count(), 2);
    assert.deepEqual((await db.query(await sql('supabase-integrity-preflight.sql'))).rows, []);
  });

  await t.test('preflight identifies incomplete history and migration aborts without partial changes', async () => {
    await db.exec('drop index profiles_one_per_user');
    const badPayment = (await db.query("insert into payments(student_id, enrollment_id, receipt_number, payment_amount, received_by, payment_date) select $1, $2, 'incomplete-test', 1, id, '2026-10-06' from profiles where user_id = $3 returning id", [student, enrollment, admin])).rows[0].id;
    const issues = (await db.query(await sql('supabase-integrity-preflight.sql'))).rows;
    assert.ok(issues.some((issue) => issue.record_id === badPayment && issue.issue === 'payment total differs from allocations'));
    await assert.rejects(db.exec(migration), /Existing enrollment\/payment inconsistencies/);
    await db.exec('rollback');
    assert.equal((await db.query("select to_regclass('public.profiles_one_per_user') as index")).rows[0].index, null);
    assert.equal(await count(), 3);
  });
});

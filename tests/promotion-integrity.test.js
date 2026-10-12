import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { PGlite } from '@electric-sql/pglite';

test('transactional promotion and graduate payment protection', async (t) => {
  const db = new PGlite();
  t.after(() => db.close());
  const sql = (name) => readFile(new URL(`../${name}`, import.meta.url), 'utf8');
  await db.exec(`create role anon; create role authenticated; create schema auth;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql as
    $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth, public to authenticated, anon;`);
  await db.exec((await sql('supabase-schema.sql')).replace('create extension if not exists pgcrypto;', ''));
  await db.exec('grant all on all tables in schema public to authenticated, anon;');
  await db.exec(await sql('supabase-rls-policies.sql'));
  await db.exec(await sql('supabase-payment-integrity-migration.sql'));
  const migration = await sql('supabase-promotion-integrity-migration.sql');
  await db.exec(migration);
  const insertId = async (query) => (await db.query(query)).rows[0].id;
  const staff = await insertId('insert into auth.users values (gen_random_uuid()) returning id');
  await db.query("insert into profiles(user_id, role, status) values ($1, 'staff', 'active')", [staff]);
  const sourceYear = await insertId("insert into school_years(school_year,status) values ('2026-2027','active') returning id");
  const targetYear = await insertId("insert into school_years(school_year,status) values ('2027-2028','inactive') returning id");
  const grade = await insertId("insert into grade_levels(grade_name) values ('Grade I') returning id");
  const nextGrade = await insertId("insert into grade_levels(grade_name) values ('Grade II') returning id");
  const finalGrade = await insertId("insert into grade_levels(grade_name) values ('Grade VI') returning id");
  await db.exec("insert into students(lrn) select 'promotion-' || n from generate_series(1,1005) n");
  await db.query(`insert into enrollments(student_id,school_year_id,grade_level_id,enrollment_status,enrollment_date)
    select id,$1,$2,'enrolled','2026-06-01' from students`, [sourceYear, grade]);
  const graduate = (await db.query("select id from students where lrn='promotion-1005'")).rows[0].id;
  await db.query('update enrollments set grade_level_id=$1 where student_id=$2', [finalGrade, graduate]);
  await db.query("insert into fees(fee_name,amount,school_year_id,status) values ('Tuition',100,$1,'active')", [targetYear]);
  const first = (await db.query("select id from enrollments where student_id=(select id from students where lrn='promotion-1')")).rows[0].id;
  const fee = (await db.query("insert into fees(fee_name,amount,school_year_id,status) values ('Old tuition',50,$1,'active') returning id", [sourceYear])).rows[0].id;
  await db.query("insert into student_fees(student_id,enrollment_id,fee_id,amount,status) select student_id,id,$1,50,'unpaid' from enrollments", [fee]);
  await db.query(`insert into payments(student_id,enrollment_id,receipt_number,payment_amount,received_by,payment_date)
    select e.student_id,e.id,'OLD-' || e.id,50,p.id,'2026-06-02' from enrollments e
    cross join profiles p where e.id<>$1 and p.user_id=$2`, [first,staff]);
  await db.query('insert into payment_details(payment_id,fee_id,amount_paid) select id,$1,50 from payments', [fee]);
  const promote = async (user = staff) => {
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [user]);
    await db.exec('set role authenticated');
    try { return (await db.query("select promote_students($1,$2,'2027-06-01') as result", [sourceYear, targetYear])).rows[0].result; }
    finally { await db.exec('reset role'); }
  };
  await t.test('school-year migration reconciles duplicates and activation is atomic', async () => {
    await db.query("update school_years set status='active',created_at='2027-01-01' where id=$1", [targetYear]);
    const yearMigration = await sql('supabase-school-year-integrity-migration.sql');
    await db.exec(yearMigration);
    assert.equal((await db.query("select id from school_years where status='active'")).rows[0].id, targetYear);
    await assert.rejects(db.query("update school_years set status='active' where id=$1", [sourceYear]), /duplicate key/);
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [staff]);
    await db.exec('set role authenticated');
    try {
      await db.query('select activate_school_year($1)', [sourceYear]);
      await assert.rejects(db.query('select activate_school_year(gen_random_uuid())'), /not found/);
      assert.equal((await db.query("select id from school_years where status='active'")).rows[0].id, sourceYear);
      await db.query("select save_school_year($1,'2027-2028','active')", [targetYear]);
      assert.equal((await db.query("select id from school_years where status='active'")).rows[0].id, targetYear);
    } finally { await db.exec('reset role'); }
    await db.exec(`create function fail_year_activation() returns trigger language plpgsql as
      $$ begin if new.status = 'active' then raise exception 'simulated activation failure'; end if; return new; end $$;
      create trigger fail_year_activation before update on school_years for each row execute function fail_year_activation();`);
    await assert.rejects(db.query('select activate_school_year($1)', [sourceYear]), /simulated activation failure/);
    assert.equal((await db.query("select id from school_years where status='active'")).rows[0].id, targetYear);
    await db.exec('drop trigger fail_year_activation on school_years; drop function fail_year_activation();');
    await db.exec(yearMigration);
  });
  await t.test('rejects inactive accounts', async () => {
    await db.query("update profiles set status='inactive' where user_id=$1", [staff]);
    await assert.rejects(promote(), /active admin or staff/);
    await db.query("update profiles set status='active' where user_id=$1", [staff]);
  });
  await t.test('a late assessment failure rolls back target enrollments and source statuses', async () => {
    await db.exec(`create function fail_promotion() returns trigger language plpgsql as
      $$ begin raise exception 'simulated assessment failure'; end $$;
      create trigger fail_promotion before insert on student_fees for each row execute function fail_promotion();`);
    await assert.rejects(promote(), /simulated assessment failure/);
    assert.equal(Number((await db.query('select count(*) from enrollments where school_year_id=$1', [targetYear])).rows[0].count), 0);
    assert.equal(Number((await db.query("select count(*) from enrollments where enrollment_status='enrolled'")).rows[0].count), 1005);
    await db.exec('drop trigger fail_promotion on student_fees; drop function fail_promotion();');
  });
  await t.test('missing immediate grade aborts rather than skipping a grade', async () => {
    await db.query("update grade_levels set status='inactive' where id=$1", [nextGrade]);
    await assert.rejects(promote(), /immediate next grade/);
    await db.query("update grade_levels set status='active' where id=$1", [nextGrade]);
  });
  await t.test('promotes more than 1000 students, preserves balance, closes sources, graduates and retries safely', async () => {
    assert.deepEqual(await promote(), { promoted: 1005, graduated: 1, pending: 1, skipped: 0 });
    assert.equal(Number((await db.query("select count(*) from enrollments where school_year_id=$1 and enrollment_status='inactive'", [sourceYear])).rows[0].count), 1005);
    assert.equal(Number((await db.query('select count(*) from student_fees where fee_id<>$1', [fee])).rows[0].count), 1004);
    assert.equal((await db.query('select enrollment_status from enrollments where student_id=$1 and school_year_id=$2', [graduate,targetYear])).rows[0].enrollment_status, 'graduated');
    assert.equal((await promote()).promoted, 0);
    await db.exec(migration);
  });
  await t.test('existing graduates with an older active enrollment cannot record a payment', async () => {
    const old = (await db.query('select id from enrollments where student_id=$1 and school_year_id=$2', [graduate,sourceYear])).rows[0].id;
    await db.query("update enrollments set enrollment_status='enrolled',created_at='2026-06-01' where id=$1", [old]);
    await db.query("insert into fees(fee_name,amount,school_year_id,status) values ('Additional historical fee',50,$1,'active')", [sourceYear]);
    const additionalFee = (await db.query("select id from fees where fee_name='Additional historical fee'")).rows[0].id;
    await db.query("insert into student_fees(student_id,enrollment_id,fee_id,amount,status) values ($1,$2,$3,50,'unpaid')", [graduate,old,additionalFee]);
    
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [staff]);
    await db.exec('set role authenticated');
    try {
      await assert.rejects(db.query("select record_payment($1,$2::jsonb,'2027-06-01','test',gen_random_uuid())", [old,JSON.stringify([{fee_id:additionalFee,amount_paid:10}])]), /Graduated students/);
    } finally { await db.exec('reset role'); }
    assert.equal(Number((await db.query('select count(*) from payments')).rows[0].count), 1004);
  });
});

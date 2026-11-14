/** Phase 1/2 schema: all 13 required tables plus the session store table. */
export async function up(knex) {
  await knex.raw(`
  CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    role TEXT NOT NULL CHECK (role IN ('intern','company','admin')),
    email TEXT NOT NULL,
    full_name TEXT NOT NULL,
    phone TEXT,
    password_hash TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending_verification'
      CHECK (status IN ('pending_verification','active','suspended')),
    email_verified_at TIMESTAMPTZ,
    verification_token_hash TEXT,
    verification_expires_at TIMESTAMPTZ,
    reset_token_hash TEXT,
    reset_expires_at TIMESTAMPTZ,
    county TEXT,
    gender TEXT,
    date_of_birth DATE,
    consent_at TIMESTAMPTZ,
    failed_logins INT NOT NULL DEFAULT 0,
    locked_until TIMESTAMPTZ,
    last_login_at TIMESTAMPTZ,
    access_activated_at TIMESTAMPTZ,
    access_payment_id BIGINT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );
  CREATE UNIQUE INDEX users_email_uq ON users (lower(email));
  CREATE INDEX users_role_status_idx ON users (role, status);
  CREATE INDEX users_verification_idx ON users (verification_token_hash);
  CREATE INDEX users_reset_idx ON users (reset_token_hash);

  CREATE TABLE intern_profiles (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    photo_path TEXT,
    institution TEXT,
    course TEXT,
    qualification_level TEXT,
    graduation_year INT,
    skills TEXT[] NOT NULL DEFAULT '{}',
    career_interests TEXT[] NOT NULL DEFAULT '{}',
    experience TEXT,
    preferred_county TEXT,
    preferred_work_arrangement TEXT CHECK (preferred_work_arrangement IN ('remote','hybrid','physical')),
    linkedin_url TEXT,
    portfolio_url TEXT,
    cv_path TEXT,
    completion_pct INT NOT NULL DEFAULT 0 CHECK (completion_pct BETWEEN 0 AND 100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );

  CREATE TABLE company_profiles (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    company_name TEXT NOT NULL,
    official_email TEXT NOT NULL,
    phone TEXT,
    address TEXT,
    county TEXT,
    industry TEXT,
    website TEXT,
    description TEXT,
    logo_path TEXT,
    registration_number TEXT,
    approval_status TEXT NOT NULL DEFAULT 'pending'
      CHECK (approval_status IN ('pending','approved','rejected','suspended')),
    rejection_reason TEXT,
    approved_by BIGINT REFERENCES users(id),
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );
  CREATE INDEX company_profiles_status_idx ON company_profiles (approval_status);

  CREATE TABLE company_documents (
    id BIGSERIAL PRIMARY KEY,
    company_id BIGINT NOT NULL REFERENCES company_profiles(id) ON DELETE CASCADE,
    doc_type TEXT NOT NULL,
    file_path TEXT NOT NULL,
    original_name TEXT,
    verified BOOLEAN NOT NULL DEFAULT false,
    verified_by BIGINT REFERENCES users(id),
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );
  CREATE INDEX company_documents_company_idx ON company_documents (company_id);

  CREATE TABLE internship_categories (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    icon TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );

  CREATE TABLE internships (
    id BIGSERIAL PRIMARY KEY,
    reference TEXT NOT NULL UNIQUE,
    company_id BIGINT NOT NULL REFERENCES company_profiles(id) ON DELETE CASCADE,
    category_id BIGINT NOT NULL REFERENCES internship_categories(id),
    title TEXT NOT NULL,
    department TEXT,
    description TEXT NOT NULL,
    responsibilities TEXT,
    qualifications TEXT,
    skills TEXT[] NOT NULL DEFAULT '{}',
    positions INT NOT NULL DEFAULT 1 CHECK (positions > 0),
    county TEXT,
    location TEXT,
    work_arrangement TEXT NOT NULL CHECK (work_arrangement IN ('remote','hybrid','physical')),
    duration_months INT NOT NULL CHECK (duration_months > 0),
    start_date DATE,
    deadline DATE NOT NULL,
    is_paid BOOLEAN NOT NULL DEFAULT false,
    stipend_amount NUMERIC(12,2) CHECK (stipend_amount IS NULL OR stipend_amount >= 0),
    additional_requirements TEXT,
    status TEXT NOT NULL DEFAULT 'pending_approval'
      CHECK (status IN ('draft','pending_approval','approved','rejected','closed')),
    is_featured BOOLEAN NOT NULL DEFAULT false,
    rejection_reason TEXT,
    approved_by BIGINT REFERENCES users(id),
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );
  CREATE INDEX internships_company_idx ON internships (company_id);
  CREATE INDEX internships_category_idx ON internships (category_id);
  CREATE INDEX internships_status_deadline_idx ON internships (status, deadline);
  CREATE INDEX internships_county_idx ON internships (county);
  CREATE INDEX internships_search_idx ON internships
    USING gin (to_tsvector('english', title || ' ' || description));

  CREATE TABLE payments (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id),
    amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
    phone TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending'
      CHECK (status IN ('pending','success','failed','cancelled')),
    merchant_request_id TEXT,
    checkout_request_id TEXT UNIQUE,
    mpesa_receipt TEXT UNIQUE,
    receipt_number TEXT UNIQUE,
    result_code INT,
    result_desc TEXT,
    transaction_date TIMESTAMPTZ,
    raw_callback JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );
  CREATE INDEX payments_user_idx ON payments (user_id);
  CREATE INDEX payments_status_idx ON payments (status, created_at);
  ALTER TABLE users ADD CONSTRAINT users_access_payment_fk
    FOREIGN KEY (access_payment_id) REFERENCES payments(id);

  CREATE TABLE applications (
    id BIGSERIAL PRIMARY KEY,
    reference TEXT NOT NULL UNIQUE,
    internship_id BIGINT NOT NULL REFERENCES internships(id) ON DELETE CASCADE,
    intern_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    cover_letter TEXT NOT NULL,
    cv_path TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN
      ('submitted','under_review','shortlisted','interview_scheduled','selected','rejected','withdrawn')),
    interview_at TIMESTAMPTZ,
    interview_notes TEXT,
    company_notes TEXT,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT applications_one_per_intern UNIQUE (internship_id, intern_id)
  );
  CREATE INDEX applications_intern_idx ON applications (intern_id);
  CREATE INDEX applications_status_idx ON applications (internship_id, status);

  CREATE TABLE saved_internships (
    id BIGSERIAL PRIMARY KEY,
    intern_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    internship_id BIGINT NOT NULL REFERENCES internships(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (intern_id, internship_id)
  );

  CREATE TABLE notifications (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT,
    link TEXT,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );
  CREATE INDEX notifications_user_idx ON notifications (user_id, read_at, created_at DESC);

  CREATE TABLE admin_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_by BIGINT REFERENCES users(id),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );

  CREATE TABLE email_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    to_email TEXT NOT NULL,
    subject TEXT NOT NULL,
    template TEXT,
    status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','sent','failed')),
    error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    sent_at TIMESTAMPTZ
  );
  CREATE INDEX email_logs_status_idx ON email_logs (status, created_at);

  CREATE TABLE audit_logs (
    id BIGSERIAL PRIMARY KEY,
    actor_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity_type TEXT,
    entity_id TEXT,
    before JSONB,
    after JSONB,
    ip TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );
  CREATE INDEX audit_logs_actor_idx ON audit_logs (actor_id, created_at DESC);
  CREATE INDEX audit_logs_entity_idx ON audit_logs (entity_type, entity_id);

  CREATE TABLE contact_messages (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    subject TEXT,
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );

  -- Session store for connect-pg-simple
  CREATE TABLE "session" (
    sid VARCHAR NOT NULL PRIMARY KEY,
    sess JSON NOT NULL,
    expire TIMESTAMP(6) NOT NULL
  );
  CREATE INDEX session_expire_idx ON "session" (expire);
  `);
}

export async function down(knex) {
  await knex.raw(`
    DROP TABLE IF EXISTS "session", contact_messages, audit_logs, email_logs, admin_settings,
      notifications, saved_internships, applications;
    ALTER TABLE IF EXISTS users DROP CONSTRAINT IF EXISTS users_access_payment_fk;
    DROP TABLE IF EXISTS payments, internships, internship_categories, company_documents,
      company_profiles, intern_profiles, users CASCADE;
  `);
}

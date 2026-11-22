-- Optimize auth.uid()/auth.role() evaluation in RLS predicates without
-- changing any policy's access logic, roles, command, or permissive mode.
DO $$
DECLARE
  p record;
  v_roles text;
  v_qual text;
  v_check text;
  v_sql text;
BEGIN
  FOR p IN
    SELECT schemaname,tablename,policyname,permissive,roles,cmd,qual,with_check
    FROM pg_policies
    WHERE schemaname='public'
      AND (
        COALESCE(qual,'') ~ 'auth\.(uid|role)\(\)'
        OR COALESCE(with_check,'') ~ 'auth\.(uid|role)\(\)'
      )
  LOOP
    SELECT string_agg(quote_ident(r), ', ') INTO v_roles
    FROM unnest(p.roles) AS r;
    v_qual:=p.qual;
    v_check:=p.with_check;
    IF v_qual IS NOT NULL THEN
      v_qual:=replace(v_qual,'auth.uid()','(select auth.uid())');
      v_qual:=replace(v_qual,'auth.role()','(select auth.role())');
    END IF;
    IF v_check IS NOT NULL THEN
      v_check:=replace(v_check,'auth.uid()','(select auth.uid())');
      v_check:=replace(v_check,'auth.role()','(select auth.role())');
    END IF;
    EXECUTE format('DROP POLICY %I ON %I.%I',p.policyname,p.schemaname,p.tablename);
    v_sql:=format('CREATE POLICY %I ON %I.%I AS %s FOR %s TO %s',
      p.policyname,p.schemaname,p.tablename,lower(p.permissive),p.cmd,v_roles);
    IF v_qual IS NOT NULL THEN v_sql:=v_sql||format(' USING (%s)',v_qual); END IF;
    IF v_check IS NOT NULL THEN v_sql:=v_sql||format(' WITH CHECK (%s)',v_check); END IF;
    EXECUTE v_sql;
  END LOOP;
END $$;

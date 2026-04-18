-- Storms: signal "j'ai besoin d'espace"
CREATE TABLE public.storms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id uuid NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
  started_by uuid NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz
);
CREATE INDEX idx_storms_couple_active ON public.storms(couple_id) WHERE ended_at IS NULL;

ALTER TABLE public.storms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "storms read by couple" ON public.storms
  FOR SELECT TO authenticated
  USING (public.is_couple_member(couple_id));

CREATE POLICY "storms insert by member" ON public.storms
  FOR INSERT TO authenticated
  WITH CHECK (public.is_couple_member(couple_id) AND started_by = auth.uid());

CREATE POLICY "storms end by initiator" ON public.storms
  FOR UPDATE TO authenticated
  USING (started_by = auth.uid() AND public.is_couple_member(couple_id));

-- Notifications in-app
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id uuid NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL,
  kind text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_notifications_recipient_unread ON public.notifications(recipient_id, created_at DESC) WHERE read_at IS NULL;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications read own" ON public.notifications
  FOR SELECT TO authenticated
  USING (recipient_id = auth.uid());

CREATE POLICY "notifications insert by couple member" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (public.is_couple_member(couple_id));

CREATE POLICY "notifications mark read own" ON public.notifications
  FOR UPDATE TO authenticated
  USING (recipient_id = auth.uid());

-- Pact: status for pending/active flow (vague 2 prep, mais on l'inclut maintenant)
ALTER TABLE public.pact_rules
  ADD COLUMN status text NOT NULL DEFAULT 'active',
  ADD COLUMN proposed_at timestamptz NOT NULL DEFAULT now();
-- Toutes les règles existantes restent 'active' par défaut
